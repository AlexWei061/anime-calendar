import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userEmail: text("user_email").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const animeSelections = sqliteTable(
  "anime_selections",
  {
    userEmail: text("user_email").notNull(),
    animeId: text("anime_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userEmail, table.animeId] })],
);

export const animeEpisodeViews = sqliteTable(
  "anime_episode_views",
  {
    userEmail: text("user_email").notNull(),
    animeId: text("anime_id").notNull(),
    episodeStart: integer("episode_start").notNull(),
    episode: integer("episode").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userEmail, table.animeId, table.episodeStart, table.episode],
    }),
  ],
);
