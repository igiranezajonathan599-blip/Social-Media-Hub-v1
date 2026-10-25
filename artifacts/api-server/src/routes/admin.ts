import { Router, type IRouter } from "express";
import { db, usersTable, postsTable, messagesTable, conversationsTable, commentsTable, likesTable, sharesTable } from "@workspace/db";
import { eq, desc, count, gte, ilike, or, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

function formatUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

router.get("/admin/stats", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [[{ totalUsers }], [{ totalPosts }], [{ totalMessages }], [{ totalConversations }], [{ newUsersToday }], [{ newPostsToday }]] = await Promise.all([
    db.select({ totalUsers: count() }).from(usersTable),
    db.select({ totalPosts: count() }).from(postsTable),
    db.select({ totalMessages: count() }).from(messagesTable),
    db.select({ totalConversations: count() }).from(conversationsTable),
    db.select({ newUsersToday: count() }).from(usersTable).where(gte(usersTable.createdAt, today)),
    db.select({ newPostsToday: count() }).from(postsTable).where(gte(postsTable.createdAt, today)),
  ]);

  res.json({
    totalUsers: Number(totalUsers),
    totalPosts: Number(totalPosts),
    totalMessages: Number(totalMessages),
    totalConversations: Number(totalConversations),
    newUsersToday: Number(newUsersToday),
    newPostsToday: Number(newPostsToday),
  });
});

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
  const pageSize = 20;
  const q = req.query.q as string | undefined;
  const offset = (page - 1) * pageSize;

  const whereClause = q
    ? or(ilike(usersTable.username, `%${q}%`), ilike(usersTable.displayName, `%${q}%`), ilike(usersTable.email, `%${q}%`))
    : undefined;

  const [users, [{ total }]] = await Promise.all([
    db.select().from(usersTable).where(whereClause).orderBy(desc(usersTable.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(usersTable).where(whereClause),
  ]);

  res.json({
    users: users.map(formatUser),
    total: Number(total),
    page,
    pageSize,
  });
});

router.delete("/admin/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params["userId"] as string, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  if (userId === req.userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (targetUser.isAdmin) {
    const [{ adminCount }] = await db
      .select({ adminCount: count() })
      .from(usersTable)
      .where(eq(usersTable.isAdmin, true));
    if (Number(adminCount) <= 1) {
      res.status(409).json({ error: "The last admin cannot be deleted" });
      return;
    }
  }

  await db.transaction(async (tx) => {
    const ownedPosts = await tx
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.userId, userId));
    const postIds = ownedPosts.map((post) => post.id);

    const conversations = await tx
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.participantAId, userId),
          eq(conversationsTable.participantBId, userId),
        ),
      );
    const conversationIds = conversations.map((conversation) => conversation.id);

    await tx.delete(messagesTable).where(
      conversationIds.length > 0
        ? or(
            eq(messagesTable.senderId, userId),
            inArray(messagesTable.conversationId, conversationIds),
          )
        : eq(messagesTable.senderId, userId),
    );

    await tx.delete(commentsTable).where(
      postIds.length > 0
        ? or(eq(commentsTable.userId, userId), inArray(commentsTable.postId, postIds))
        : eq(commentsTable.userId, userId),
    );

    await tx.delete(likesTable).where(
      postIds.length > 0
        ? or(eq(likesTable.userId, userId), inArray(likesTable.postId, postIds))
        : eq(likesTable.userId, userId),
    );

    await tx.delete(sharesTable).where(
      postIds.length > 0
        ? or(eq(sharesTable.userId, userId), inArray(sharesTable.postId, postIds))
        : eq(sharesTable.userId, userId),
    );

    if (postIds.length > 0) {
      await tx.delete(postsTable).where(inArray(postsTable.id, postIds));
    }
    if (conversationIds.length > 0) {
      await tx.delete(conversationsTable).where(inArray(conversationsTable.id, conversationIds));
    }
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });

  res.json({ message: "User deleted" });
});

router.patch("/admin/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params["userId"] as string, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  if (userId === req.userId) {
    res.status(400).json({ error: "Cannot modify your own admin status" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.isAdmin) {
    const [{ adminCount }] = await db
      .select({ adminCount: count() })
      .from(usersTable)
      .where(eq(usersTable.isAdmin, true));
    if (Number(adminCount) <= 1) {
      res.status(409).json({ error: "The last admin cannot be demoted" });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: !user.isAdmin })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(updated));
});

router.get("/admin/posts", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const [posts, [{ total }]] = await Promise.all([
    db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(postsTable),
  ]);

  const postsWithAuthor = await Promise.all(
    posts.map(async (post) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId));
      const [{ likeCount }] = await db.select({ likeCount: count() }).from(likesTable).where(eq(likesTable.postId, post.id));
      const [{ commentCount }] = await db.select({ commentCount: count() }).from(commentsTable).where(eq(commentsTable.postId, post.id));
      const [{ shareCount }] = await db.select({ shareCount: count() }).from(sharesTable).where(eq(sharesTable.postId, post.id));
      return {
        id: post.id,
        userId: post.userId,
        content: post.content,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        likeCount: Number(likeCount),
        commentCount: Number(commentCount),
        isLiked: false,
        shareCount: Number(shareCount),
        isShared: false,
        author: formatUser(author),
        createdAt: post.createdAt.toISOString(),
      };
    })
  );

  res.json({
    posts: postsWithAuthor,
    total: Number(total),
    page,
    pageSize,
  });
});

router.delete("/admin/posts/:postId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const postId = parseInt(req.params["postId"] as string, 10);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  await db.delete(likesTable).where(eq(likesTable.postId, postId));
  await db.delete(commentsTable).where(eq(commentsTable.postId, postId));
  await db.delete(sharesTable).where(eq(sharesTable.postId, postId));
  await db.delete(postsTable).where(eq(postsTable.id, postId));

  res.json({ message: "Post deleted" });
});

router.get("/admin/comments", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawPage = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        comment: commentsTable,
        author: usersTable,
        post: postsTable,
      })
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.userId, usersTable.id))
      .innerJoin(postsTable, eq(commentsTable.postId, postsTable.id))
      .orderBy(desc(commentsTable.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(commentsTable),
  ]);

  res.json({
    comments: rows.map(({ comment, author, post }) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: formatUser(author),
      post: { id: post.id, content: post.content },
    })),
    total: Number(total),
    page,
    pageSize,
  });
});

router.delete("/admin/comments/:commentId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const commentId = parseInt(req.params["commentId"] as string, 10);
  if (!Number.isInteger(commentId) || commentId < 1) {
    res.status(400).json({ error: "Invalid comment ID" });
    return;
  }

  const [deleted] = await db
    .delete(commentsTable)
    .where(eq(commentsTable.id, commentId))
    .returning({ id: commentsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  res.json({ message: "Comment deleted" });
});

export default router;
