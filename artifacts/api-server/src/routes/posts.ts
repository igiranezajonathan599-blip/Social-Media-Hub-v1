import { Router, type IRouter } from "express";
import { db, postsTable, usersTable, likesTable, commentsTable, messagesTable } from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";
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

async function formatPost(post: typeof postsTable.$inferSelect, userId: number) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId));

  const [{ likeCount }] = await db
    .select({ likeCount: count() })
    .from(likesTable)
    .where(eq(likesTable.postId, post.id));

  const [{ commentCount }] = await db
    .select({ commentCount: count() })
    .from(commentsTable)
    .where(eq(commentsTable.postId, post.id));

  const userLike = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.postId, post.id), eq(likesTable.userId, userId)));

  return {
    id: post.id,
    userId: post.userId,
    content: post.content,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    likeCount: Number(likeCount),
    commentCount: Number(commentCount),
    isLiked: userLike.length > 0,
    author: formatUser(author),
    createdAt: post.createdAt.toISOString(),
  };
}

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const filterUserId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const offset = (page - 1) * 20;

  const posts = filterUserId
    ? await db.select().from(postsTable).where(eq(postsTable.userId, filterUserId)).orderBy(desc(postsTable.createdAt)).limit(20).offset(offset)
    : await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(20).offset(offset);

  const formatted = await Promise.all(posts.map((p) => formatPost(p, userId)));
  res.json(formatted);
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { content, mediaUrl, mediaType } = req.body as {
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  };

  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({ userId, content, mediaUrl, mediaType })
    .returning();

  res.status(201).json(await formatPost(post, userId));
});

router.get("/posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(await formatPost(post, userId));
});

router.delete("/posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (post.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.postId, postId));
  await db.delete(likesTable).where(eq(likesTable.postId, postId));
  await db.delete(postsTable).where(eq(postsTable.id, postId));

  res.json({ message: "Post deleted" });
});

router.post("/posts/:postId/like", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);

  const existing = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)));

  let liked: boolean;
  if (existing.length > 0) {
    await db.delete(likesTable).where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)));
    liked = false;
  } else {
    await db.insert(likesTable).values({ postId, userId });
    liked = true;
  }

  const [{ likeCount }] = await db
    .select({ likeCount: count() })
    .from(likesTable)
    .where(eq(likesTable.postId, postId));

  res.json({ liked, likeCount: Number(likeCount) });
});

router.get("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);

  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, postId))
    .orderBy(desc(commentsTable.createdAt));

  const formatted = await Promise.all(
    comments.map(async (c) => {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId));
      return {
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        content: c.content,
        author: formatUser(author),
        createdAt: c.createdAt.toISOString(),
      };
    })
  );

  res.json(formatted);
});

router.post("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);

  const { content } = req.body as { content: string };
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({ postId, userId, content })
    .returning();

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    content: comment.content,
    author: formatUser(author),
    createdAt: comment.createdAt.toISOString(),
  });
});

router.get("/feed/stats", requireAuth, async (req, res): Promise<void> => {
  const [{ totalPosts }] = await db.select({ totalPosts: count() }).from(postsTable);
  const [{ totalMessages }] = await db.select({ totalMessages: count() }).from(messagesTable);
  const [{ activeUsers }] = await db.select({ activeUsers: count() }).from(usersTable);

  res.json({
    totalPosts: Number(totalPosts),
    totalMessages: Number(totalMessages),
    activeUsers: Number(activeUsers),
  });
});

export default router;
