import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const likesTable = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharesTable = pgTable(
  "shares",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => postsTable.id),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("shares_post_user_unique").on(table.postId, table.userId)],
);

export type Post = typeof postsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type Like = typeof likesTable.$inferSelect;
export type Share = typeof sharesTable.$inferSelect;
