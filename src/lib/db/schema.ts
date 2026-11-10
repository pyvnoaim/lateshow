import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

/**
 * One row per watched movie or episode. Movies use season 0 / episode 0.
 * Title, poster and runtime are stored with the row so history and stats never need TMDB.
 */
export const watched = sqliteTable(
  "watched",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    season: integer("season").notNull().default(0),
    episode: integer("episode").notNull().default(0),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    minutes: integer("minutes").notNull().default(0),
    watchedAt: integer("watched_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [
    uniqueIndex("watched_once").on(t.userId, t.mediaType, t.tmdbId, t.season, t.episode),
    index("watched_by_time").on(t.userId, t.watchedAt),
  ],
);

export const watchlist = sqliteTable(
  "watchlist",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    addedAt: integer("added_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaType, t.tmdbId] })],
);
