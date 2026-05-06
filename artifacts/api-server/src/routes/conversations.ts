import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, count, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(u: { id: number; username: string; displayName: string; email: string; bio: string | null; avatarUrl: string | null; isAdmin: boolean; createdAt: Date }) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
  };
}

function formatMessage(msg: any, sender: any) {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    content: msg.isDeleted ? "" : msg.content,
    mediaUrl: msg.isDeleted ? null : msg.mediaUrl,
    mediaType: msg.isDeleted ? null : msg.mediaType,
    isEdited: msg.isEdited ?? false,
    isDeleted: msg.isDeleted ?? false,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    editedAt: msg.editedAt instanceof Date ? msg.editedAt.toISOString() : (msg.editedAt ?? null),
    sender: formatUser(sender),
  };
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.participantAId, userId),
        eq(conversationsTable.participantBId, userId)
      )
    )
    .orderBy(desc(conversationsTable.updatedAt));

  const results = await Promise.all(
    convs.map(async (conv) => {
      const otherUserId =
        conv.participantAId === userId ? conv.participantBId : conv.participantAId;

      const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId));
      const [lastMessage] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const [{ unreadCount }] = await db
        .select({ unreadCount: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conv.id),
            eq(messagesTable.isRead, false),
            eq(messagesTable.senderId, otherUserId)
          )
        );

      let lastMessageFormatted = null;
      if (lastMessage) {
        const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, lastMessage.senderId));
        lastMessageFormatted = formatMessage(lastMessage, sender);
      }

      return {
        id: conv.id,
        otherUser: otherUser ? formatUser(otherUser) : null,
        lastMessage: lastMessageFormatted,
        unreadCount: Number(unreadCount),
        updatedAt: conv.updatedAt.toISOString(),
      };
    })
  );

  res.json(results);
});

router.post("/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const targetUserId = parseInt(req.body.userId, 10);

  if (isNaN(targetUserId) || targetUserId === userId) {
    res.status(400).json({ error: "Invalid target user" });
    return;
  }

  const existing = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        and(eq(conversationsTable.participantAId, userId), eq(conversationsTable.participantBId, targetUserId)),
        and(eq(conversationsTable.participantAId, targetUserId), eq(conversationsTable.participantBId, userId))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const conv = existing[0];
    const [a] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantAId));
    const [b] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantBId));
    res.status(201).json({ id: conv.id, participantA: formatUser(a), participantB: formatUser(b), createdAt: conv.createdAt.toISOString() });
    return;
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({ participantAId: userId, participantBId: targetUserId })
    .returning();

  const [a] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantAId));
  const [b] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantBId));

  res.status(201).json({ id: conv.id, participantA: formatUser(a), participantB: formatUser(b), createdAt: conv.createdAt.toISOString() });
});

router.get("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const conversationId = parseInt(req.params["conversationId"] as string, 10);
  if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const [conv] = await db.select().from(conversationsTable).where(
    and(eq(conversationsTable.id, conversationId), or(eq(conversationsTable.participantAId, userId), eq(conversationsTable.participantBId, userId)))
  );
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const beforeParam = req.query.before ? parseInt(req.query.before as string, 10) : undefined;

  const messages = await db
    .select()
    .from(messagesTable)
    .where(beforeParam
      ? and(eq(messagesTable.conversationId, conversationId), lt(messagesTable.id, beforeParam))
      : eq(messagesTable.conversationId, conversationId)
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  const messagesWithSenders = await Promise.all(
    messages.map(async (msg) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
      return formatMessage(msg, sender);
    })
  );

  // Mark messages as read
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(eq(messagesTable.conversationId, conversationId), eq(messagesTable.isRead, false)));

  res.json(messagesWithSenders.reverse());
});

router.post("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const conversationId = parseInt(req.params["conversationId"] as string, 10);
  if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const [conv] = await db.select().from(conversationsTable).where(
    and(eq(conversationsTable.id, conversationId), or(eq(conversationsTable.participantAId, userId), eq(conversationsTable.participantBId, userId)))
  );
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const { content = "", mediaUrl, mediaType } = req.body as { content?: string; mediaUrl?: string; mediaType?: string };

  if (!content && !mediaUrl) {
    res.status(400).json({ error: "Content or media is required" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({ conversationId, senderId: userId, content, mediaUrl, mediaType })
    .returning();

  await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json(formatMessage(message, sender));
});

router.patch("/conversations/:conversationId/messages/:messageId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const conversationId = parseInt(req.params["conversationId"] as string, 10);
  const messageId = parseInt(req.params["messageId"] as string, 10);
  if (isNaN(conversationId) || isNaN(messageId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [message] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), eq(messagesTable.conversationId, conversationId)));
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  if (message.senderId !== userId) { res.status(403).json({ error: "Not your message" }); return; }
  if (message.isDeleted) { res.status(400).json({ error: "Cannot edit deleted message" }); return; }

  const { content } = req.body as { content: string };
  if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

  const [updated] = await db
    .update(messagesTable)
    .set({ content: content.trim(), isEdited: true, editedAt: new Date() })
    .where(eq(messagesTable.id, messageId))
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json(formatMessage(updated, sender));
});

router.delete("/conversations/:conversationId/messages/:messageId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const conversationId = parseInt(req.params["conversationId"] as string, 10);
  const messageId = parseInt(req.params["messageId"] as string, 10);
  if (isNaN(conversationId) || isNaN(messageId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [message] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), eq(messagesTable.conversationId, conversationId)));
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  if (message.senderId !== userId) { res.status(403).json({ error: "Not your message" }); return; }

  await db.update(messagesTable).set({ isDeleted: true, content: "" }).where(eq(messagesTable.id, messageId));
  res.json({ message: "Message deleted" });
});

export default router;
