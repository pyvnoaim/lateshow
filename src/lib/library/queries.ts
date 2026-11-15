import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { and, count, desc, eq, gte, isNotNull, isNull, lt, max, or, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { importBatch, rating, watched, watchlist } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb";
import type { Unsure } from "@/lib/library/matching";

const byTitle = (userId: string, type: MediaType, tmdbId: number) => ({
  watched: and(eq(watched.userId, userId), eq(watched.mediaType, type), eq(watched.tmdbId, tmdbId)),
  watchlist: and(eq(watchlist.userId, userId), eq(watchlist.mediaType, type), eq(watchlist.tmdbId, tmdbId)),
});

/**
 * What this user has done with one title: on the watchlist, which episodes ("season-episode") are watched, rating, and
 * `justMarked`: something of it marked in the last day (the title page then asks "Watched it earlier?").
 */
export async function getTitleLibrary(userId: string, type: MediaType, tmdbId: number) {
  const where = byTitle(userId, type, tmdbId);
  const [listed, rows, rated] = await Promise.all([
    db.select({ userId: watchlist.userId }).from(watchlist).where(where.watchlist).limit(1),
    db
      .select({ season: watched.season, episode: watched.episode, at: watched.watchedAt })
      .from(watched)
      .where(where.watched),
    db
      .select({ value: rating.value })
      .from(rating)
      .where(and(eq(rating.userId, userId), eq(rating.mediaType, type), eq(rating.tmdbId, tmdbId))),
  ]);
  return {
    onWatchlist: listed.length > 0,
    watched: rows.map((r) => `${r.season}-${r.episode}`),
    rating: rated[0]?.value ?? null,
    justMarked: rows.some((r) => r.at && r.at.getTime() > Date.now() - 86_400_000),
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

/** Watch time per row from `since` up to `until`, for the year heatmap. */
export async function getWatchTimes(userId: string, since: Date, until?: Date) {
  return db
    .select({ at: watched.watchedAt, minutes: watched.minutes })
    .from(watched)
    .where(
      and(eq(watched.userId, userId), gte(watched.watchedAt, since), until ? lt(watched.watchedAt, until) : undefined),
    );
}

/** Everything watched from `since` up to `until`, newest first: one heatmap day's titles. */
export async function getWatchedBetween(userId: string, since: Date, until: Date) {
  return db
    .select()
    .from(watched)
    .where(and(eq(watched.userId, userId), gte(watched.watchedAt, since), lt(watched.watchedAt, until)))
    .orderBy(desc(watched.watchedAt));
}

/** The years (UTC) this user watched something in, newest first, so the heatmap offers only those. */
export async function getWatchYears(userId: string) {
  // ponytail: reads every row of the user through the (user_id, watched_at) index. Fine for a big import, cache if not
  const year = sql<string>`strftime('%Y', ${watched.watchedAt} / 1000, 'unixepoch')`;
  const rows = await db
    .selectDistinct({ year })
    .from(watched)
    .where(and(eq(watched.userId, userId), isNotNull(watched.watchedAt)))
    .orderBy(desc(year));
  return rows.map((r) => Number(r.year));
}

/**
 * The last titles watched, each once (a binge of one show is one title), most recent first. Title and poster come from
 * the newest row (SQLite takes bare columns from the max() row).
 * ponytail: only the newest 500 rows are looked at (index read, not a scan of a big import). Fewer titles if those are one long binge.
 */
export async function getRecentTitles(userId: string, limit = 12) {
  const latest = db
    .select()
    .from(watched)
    // a title marked "A while ago" (no date) isn't recent
    .where(and(eq(watched.userId, userId), isNotNull(watched.watchedAt)))
    .orderBy(desc(watched.watchedAt))
    .limit(500)
    .as("latest");
  const last = max(latest.watchedAt);
  return db
    .select({
      mediaType: latest.mediaType,
      tmdbId: latest.tmdbId,
      title: latest.title,
      posterPath: latest.posterPath,
      last,
    })
    .from(latest)
    .groupBy(latest.mediaType, latest.tmdbId)
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

/** The unclear titles your imports still wait on, with the import each belongs to (Settings › Import lists them) */
export async function getOpenPicks(userId: string) {
  const rows = await db
    .select({ id: importBatch.id, open: importBatch.open })
    .from(importBatch)
    .where(and(eq(importBatch.userId, userId), isNotNull(importBatch.open)))
    .orderBy(desc(importBatch.createdAt));
  return rows.flatMap((r) => (r.open as Unsure[]).map((u) => ({ ...u, importId: r.id })));
}

/** Your past imports that still hold something, newest first: what Settings › Import can remove again. */
export async function getImports(userId: string) {
  const watches = db
    .select({ id: watched.importId, n: count().as("watches") })
    .from(watched)
    .where(eq(watched.userId, userId))
    .groupBy(watched.importId)
    .as("watches");
  const listed = db
    .select({ id: watchlist.importId, n: count().as("listed") })
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .groupBy(watchlist.importId)
    .as("listed");
  const rows = await db
    .select({
      id: importBatch.id,
      source: importBatch.source,
      createdAt: importBatch.createdAt,
      watches: watches.n,
      listed: listed.n,
    })
    .from(importBatch)
    .leftJoin(watches, eq(watches.id, importBatch.id))
    .leftJoin(listed, eq(listed.id, importBatch.id))
    .where(eq(importBatch.userId, userId))
    .orderBy(desc(importBatch.createdAt));
  return rows
    .map((r) => ({ ...r, watches: r.watches ?? 0, listed: r.listed ?? 0 }))
    .filter((r) => r.watches + r.listed > 0);
}
