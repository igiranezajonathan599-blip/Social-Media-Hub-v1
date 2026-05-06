import { Router, type IRouter } from "express";
import { db, usersTable, postsTable } from "@workspace/db";
import { eq, ilike, or, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  let users;
  if (q) {
    users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        bio: usersTable.bio,
        avatarUrl: usersTable.avatarUrl,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        or(
          ilike(usersTable.username, `%${q}%`),
          ilike(usersTable.displayName, `%${q}%`)
        )
      )
      .limit(20);
  } else {
    users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        bio: usersTable.bio,
        avatarUrl: usersTable.avatarUrl,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .limit(20);
  }

  res.json(
    users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.get("/users/me/profile", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(postsTable)
    .where(eq(postsTable.userId, user.id));

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    postCount: Number(postCount),
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/users/me/profile", requireAuth, async (req, res): Promise<void> => {
  const { displayName, bio, avatarUrl } = req.body as {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };

  const [user] = await db
    .update(usersTable)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(bio !== undefined && { bio }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(postsTable)
    .where(eq(postsTable.userId, userId));

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    postCount: Number(postCount),
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
