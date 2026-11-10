import "server-only";
import { and, count, desc, eq, gte, sum } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { watched, watchlist } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb";

const byTitle = (userId: string, type: MediaType, tmdbId: number) => ({
  watched: and(eq(watched.userId, userId), eq(watched.mediaType, type), eq(watched.tmdbId, tmdbId)),
  watchlist: and(eq(watchlist.userId, userId), eq(watchlist.mediaType, type), eq(watchlist.tmdbId, tmdbId)),
});

/** What this user has done with one title: on the watchlist, which episodes ("season-episode") are watched. */
export async function getTitleLibrary(userId: string, type: MediaType, tmdbId: number) {
  const where = byTitle(userId, type, tmdbId);
  const [listed, rows] = await Promise.all([
    db.select({ userId: watchlist.userId }).from(watchlist).where(where.watchlist).limit(1),
    db.select({ season: watched.season, episode: watched.episode }).from(watched).where(where.watched),
  ]);
  return { onWatchlist: listed.length > 0, watched: rows.map((r) => `${r.season}-${r.episode}`) };
}

export async function getWatchlist(userId: string) {
  return db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.addedAt));
}

export async function getHistory(userId: string, limit = 50) {
  return db.select().from(watched).where(eq(watched.userId, userId)).orderBy(desc(watched.watchedAt)).limit(limit);
}

export async function getStats(userId: string) {
  const rows = await db
    .select({ mediaType: watched.mediaType, items: count(), minutes: sum(watched.minutes) })
    .from(watched)
    .where(eq(watched.userId, userId))
    .groupBy(watched.mediaType);
  const of = (t: MediaType) => rows.find((r) => r.mediaType === t);
  return {
    movies: of("movie")?.items ?? 0,
    episodes: of("tv")?.items ?? 0,
    minutes: rows.reduce((total, r) => total + Number(r.minutes ?? 0), 0),
  };
}

/** Watch time per row since a date, for the year heatmap. */
export async function getWatchTimes(userId: string, since: Date) {
  return db
    .select({ at: watched.watchedAt, minutes: watched.minutes })
    .from(watched)
    .where(and(eq(watched.userId, userId), gte(watched.watchedAt, since)));
}
