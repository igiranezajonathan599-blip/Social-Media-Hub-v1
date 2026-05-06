import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, count, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(u: { id: number; username: string; displayName: string; email: string; bio: string | null; avatarUrl: string | null; createdAt: Date }) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt.toISOString(),
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

      const [otherUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, otherUserId));

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
        const [sender] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, lastMessage.senderId));
        lastMessageFormatted = {
          id: lastMessage.id,
          conversationId: lastMessage.conversationId,
          senderId: lastMessage.senderId,
          content: lastMessage.content,
          mediaUrl: lastMessage.mediaUrl,
          mediaType: lastMessage.mediaType,
          createdAt: lastMessage.createdAt.toISOString(),
          sender: formatUser(sender),
        };
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
        and(
          eq(conversationsTable.participantAId, userId),
          eq(conversationsTable.participantBId, targetUserId)
        ),
        and(
          eq(conversationsTable.participantAId, targetUserId),
          eq(conversationsTable.participantBId, userId)
        )
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const conv = existing[0];
    const [a] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantAId));
    const [b] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantBId));
    res.status(201).json({
      id: conv.id,
      participantA: formatUser(a),
      participantB: formatUser(b),
      createdAt: conv.createdAt.toISOString(),
    });
    return;
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({ participantAId: userId, participantBId: targetUserId })
    .returning();

  const [a] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantAId));
  const [b] = await db.select().from(usersTable).where(eq(usersTable.id, conv.participantBId));

  res.status(201).json({
    id: conv.id,
    participantA: formatUser(a),
    participantB: formatUser(b),
    createdAt: conv.createdAt.toISOString(),
  });
});

router.get("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const conversationId = parseInt(rawId, 10);

  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        or(
          eq(conversationsTable.participantAId, userId),
          eq(conversationsTable.participantBId, userId)
        )
      )
    );

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const beforeParam = req.query.before ? parseInt(req.query.before as string, 10) : undefined;

  let query = db
    .select()
    .from(messagesTable)
    .where(
      beforeParam
        ? and(eq(messagesTable.conversationId, conversationId), lt(messagesTable.id, beforeParam))
        : eq(messagesTable.conversationId, conversationId)
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  const messages = await query;

  const messagesWithSenders = await Promise.all(
    messages.map(async (msg) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        createdAt: msg.createdAt.toISOString(),
        sender: formatUser(sender),
      };
    })
  );

  res.json(messagesWithSenders.reverse());
});

router.post("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const conversationId = parseInt(rawId, 10);

  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        or(
          eq(conversationsTable.participantAId, userId),
          eq(conversationsTable.participantBId, userId)
        )
      )
    );

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const { content, mediaUrl, mediaType } = req.body as {
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  };

  if (content == null || typeof content !== "string") {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({ conversationId, senderId: userId, content, mediaUrl, mediaType })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    mediaUrl: message.mediaUrl,
    mediaType: message.mediaType,
    createdAt: message.createdAt.toISOString(),
    sender: formatUser(sender),
  });
});

export default router;
