import { Router, type IRouter } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}

// Auto-sync Clerk user to DB and return profile
router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));

  if (!user) {
    // First time — fetch Clerk user data and create DB record
    try {
      const clerkUser = await clerk.users.getUser(auth.userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const displayName =
        clerkUser.fullName ||
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        email.split("@")[0];
      const avatarUrl = clerkUser.imageUrl || null;

      // Try to link by email first (migrates existing demo users)
      const [existingByEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existingByEmail) {
        [user] = await db
          .update(usersTable)
          .set({ clerkId: auth.userId, avatarUrl: avatarUrl ?? existingByEmail.avatarUrl })
          .where(eq(usersTable.id, existingByEmail.id))
          .returning();
      } else {
        // Create new user
        let username =
          clerkUser.username ||
          email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() ||
          `user${Date.now().toString().slice(-6)}`;

        const [usernameExists] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.username, username));
        if (usernameExists) {
          username = `${username}${Date.now().toString().slice(-4)}`;
        }

        [user] = await db
          .insert(usersTable)
          .values({ clerkId: auth.userId, username, displayName, email, avatarUrl })
          .returning();
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to sync user account" });
      return;
    }
  }

  res.json(formatUser(user));
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me/admin-check", requireAuth, async (req, res): Promise<void> => {
  res.json({ isAdmin: req.isAdmin ?? false });
});

export default router;
