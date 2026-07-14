import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
