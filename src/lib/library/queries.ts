import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { and, count, desc, eq, gte, isNull, max, or, sum } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rating, watched, watchlist } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb";

const byTitle = (userId: string, type: MediaType, tmdbId: number) => ({
  watched: and(eq(watched.userId, userId), eq(watched.mediaType, type), eq(watched.tmdbId, tmdbId)),
  watchlist: and(eq(watchlist.userId, userId), eq(watchlist.mediaType, type), eq(watchlist.tmdbId, tmdbId)),
});

/** What this user has done with one title: on the watchlist, which episodes ("season-episode") are watched, rating. */
export async function getTitleLibrary(userId: string, type: MediaType, tmdbId: number) {
  const where = byTitle(userId, type, tmdbId);
  const [listed, rows, rated] = await Promise.all([
    db.select({ userId: watchlist.userId }).from(watchlist).where(where.watchlist).limit(1),
    db.select({ season: watched.season, episode: watched.episode }).from(watched).where(where.watched),
    db
      .select({ value: rating.value })
      .from(rating)
      .where(and(eq(rating.userId, userId), eq(rating.mediaType, type), eq(rating.tmdbId, tmdbId))),
  ]);
  return {
    onWatchlist: listed.length > 0,
    watched: rows.map((r) => `${r.season}-${r.episode}`),
    rating: rated[0]?.value ?? null,
  };
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

/** The last titles watched, each once (a binge of one show is one title), most recent first. */
export async function getRecentTitles(userId: string, limit = 12) {
  const last = max(watched.watchedAt);
  return db
    .select({
      mediaType: watched.mediaType,
      tmdbId: watched.tmdbId,
      title: watched.title,
      posterPath: watched.posterPath,
    })
    .from(watched)
    .where(eq(watched.userId, userId))
    .groupBy(watched.mediaType, watched.tmdbId)
    .orderBy(desc(last))
    .limit(limit);
}

/** Shows you watched episodes of, most recent first. */
export async function getRecentShows(userId: string, limit = 5) {
  const last = max(watched.watchedAt);
  return db
    .select({ tmdbId: watched.tmdbId, title: watched.title, last })
    .from(watched)
    .where(and(eq(watched.userId, userId), eq(watched.mediaType, "tv")))
    .groupBy(watched.tmdbId)
    .orderBy(desc(last))
    .limit(limit);
}

/** Every title you've watched anything of, as "movie-123" / "tv-456" keys (to leave them out of suggestions). */
export async function getWatchedTitleKeys(userId: string) {
  const rows = await db
    .selectDistinct({ mediaType: watched.mediaType, tmdbId: watched.tmdbId })
    .from(watched)
    .where(eq(watched.userId, userId));
  return new Set(rows.map((r) => `${r.mediaType}-${r.tmdbId}`));
}

/**
 * What "Because you ..." suggestions start from: a title you loved in the last 30 days, else the last thing you
 * watched that you didn't rate down. `loved` picks the heading.
 */
export async function getSuggestionSeed(userId: string) {
  const ratedAs = and(
    eq(rating.userId, watched.userId),
    eq(rating.mediaType, watched.mediaType),
    eq(rating.tmdbId, watched.tmdbId),
  );
  const pick = { mediaType: watched.mediaType, tmdbId: watched.tmdbId, title: watched.title, value: rating.value };
  const [[loved], [last]] = await Promise.all([
    db
      .select(pick)
      .from(rating)
      .innerJoin(watched, ratedAs)
      .where(
        and(
          eq(rating.userId, userId),
          eq(rating.value, 2),
          gte(rating.ratedAt, new Date(Date.now() - 30 * 86_400_000)),
        ),
      )
      .orderBy(desc(rating.ratedAt))
      .limit(1),
    db
      .select(pick)
      .from(watched)
      .leftJoin(rating, ratedAs)
      .where(and(eq(watched.userId, userId), or(isNull(rating.value), gte(rating.value, 1))))
      .orderBy(desc(watched.watchedAt))
      .limit(1),
  ]);
  const seed = loved ?? last;
  return seed ? { ...seed, loved: seed.value === 2 } : null;
}

/**
 * What you've watched, "movie-27205" -> how many different episodes (a movie counts 1), for the badge at the start of
 * every poster caption. Null when signed out. One grouped query per request, shared by every poster on the page.
 */
export const getMyWatchedKeys = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const rows = await db
    .select({
      mediaType: watched.mediaType,
      tmdbId: watched.tmdbId,
      seen: count(), // one row per episode (unique index), so this is episodes seen
    })
    .from(watched)
    .where(eq(watched.userId, session.user.id))
    .groupBy(watched.mediaType, watched.tmdbId);
  return new Map(rows.map((r) => [`${r.mediaType}-${r.tmdbId}`, r.seen]));
});

/** Your watchlist as "movie-27205" keys, for the + on every poster. Null when signed out. Once per request. */
export const getMyWatchlistKeys = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const rows = await db
    .select({ mediaType: watchlist.mediaType, tmdbId: watchlist.tmdbId })
    .from(watchlist)
    .where(eq(watchlist.userId, session.user.id));
  return new Set(rows.map((r) => `${r.mediaType}-${r.tmdbId}`));
});
