import { Router, type IRouter } from "express";
import { db, usersTable, postsTable, messagesTable, conversationsTable, commentsTable, likesTable } from "@workspace/db";
import { eq, desc, count, gte, ilike, or, sql } from "drizzle-orm";
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

  await db.delete(likesTable).where(eq(likesTable.userId, userId));
  await db.delete(commentsTable).where(eq(commentsTable.userId, userId));
  await db.delete(messagesTable).where(eq(messagesTable.senderId, userId));
  await db.delete(postsTable).where(eq(postsTable.userId, userId));
  await db.delete(conversationsTable).where(
    or(eq(conversationsTable.participantAId, userId), eq(conversationsTable.participantBId, userId))
  );
  await db.delete(usersTable).where(eq(usersTable.id, userId));

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
      return {
        id: post.id,
        userId: post.userId,
        content: post.content,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        likeCount: Number(likeCount),
        commentCount: Number(commentCount),
        isLiked: false,
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
  await db.delete(postsTable).where(eq(postsTable.id, postId));

  res.json({ message: "Post deleted" });
});

export default router;
