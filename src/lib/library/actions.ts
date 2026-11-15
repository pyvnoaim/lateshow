"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { rating, watched, watchlist } from "@/lib/db/schema";
import { getLanguage } from "@/lib/region";
import { img, searchTitles } from "@/lib/tmdb";
import { getMyWatchlistKeys } from "./queries";

// Title and poster come from our own server rendered page. Validated anyway, and they only ever show to the same user.
const titleRef = z.object({
  type: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  posterPath: z
    .string()
    .regex(/^\/[\w.-]+$/)
    .nullable(),
});

const watchedRef = titleRef.extend({
  season: z.number().int().min(0).default(0),
  episode: z.number().int().min(0).default(0),
  minutes: z.number().int().min(0).max(1000).default(0),
});

export type TitleRef = z.input<typeof titleRef>;
export type WatchedRef = z.input<typeof watchedRef>;

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Sign in to save this.");
  return session.user.id;
}

export async function setOnWatchlist(ref: TitleRef, on: boolean) {
  const userId = await requireUserId();
  const t = titleRef.parse(ref);
  if (on) {
    await db
      .insert(watchlist)
      .values({ userId, mediaType: t.type, tmdbId: t.tmdbId, title: t.title, posterPath: t.posterPath })
      .onConflictDoNothing();
  } else {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaType, t.type), eq(watchlist.tmdbId, t.tmdbId)));
  }
  refresh();
}

/** Marks a movie (season and episode 0) or one episode as watched or not. Watching a title takes it off the watchlist. */
export async function setWatched(ref: WatchedRef, on: boolean) {
  const userId = await requireUserId();
  const w = watchedRef.parse(ref);
  const same = and(
    eq(watched.userId, userId),
    eq(watched.mediaType, w.type),
    eq(watched.tmdbId, w.tmdbId),
    eq(watched.season, w.season),
    eq(watched.episode, w.episode),
  );
  if (on) {
    db.transaction((tx) => {
      tx.insert(watched)
        .values({
          userId,
          mediaType: w.type,
          tmdbId: w.tmdbId,
          season: w.season,
          episode: w.episode,
          title: w.title,
          posterPath: w.posterPath,
          minutes: w.minutes,
        })
        .onConflictDoNothing()
        .run();
      tx.delete(watchlist)
        .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaType, w.type), eq(watchlist.tmdbId, w.tmdbId)))
        .run();
    });
  } else {
    await db.delete(watched).where(same);
  }
  refresh();
}

/** Rates a title (-1 not for me, 1 liked, 2 loved), null clears it. */
export async function setRating(ref: TitleRef, value: number | null) {
  const userId = await requireUserId();
  const t = titleRef.parse(ref);
  const v = z
    .union([z.literal(-1), z.literal(1), z.literal(2)])
    .nullable()
    .parse(value);
  const key = { userId, mediaType: t.type, tmdbId: t.tmdbId };
  if (v === null) {
    await db
      .delete(rating)
      .where(and(eq(rating.userId, userId), eq(rating.mediaType, t.type), eq(rating.tmdbId, t.tmdbId)));
  } else {
    await db
      .insert(rating)
      .values({ ...key, value: v })
      .onConflictDoUpdate({
        target: [rating.userId, rating.mediaType, rating.tmdbId],
        set: { value: v, ratedAt: new Date() },
      });
  }
  refresh();
}

/** "Episodes 1 and 2 too?": marks several episodes of one season as watched at once (after you checked a later one). */
export async function setEarlierWatched(ref: TitleRef, season: number, episodes: { n: number; minutes: number }[]) {
  const userId = await requireUserId();
  const t = titleRef.parse(ref);
  const s = z.number().int().min(0).parse(season);
  const eps = z
    .array(z.object({ n: z.number().int().min(1), minutes: z.number().int().min(0).max(1000) }))
    .max(500)
    .parse(episodes);
  if (eps.length === 0) return;
  db.transaction((tx) => {
    tx.insert(watched)
      .values(
        eps.map((e) => ({
          userId,
          mediaType: t.type,
          tmdbId: t.tmdbId,
          season: s,
          episode: e.n,
          title: t.title,
          posterPath: t.posterPath,
          minutes: e.minutes,
        })),
      )
      .onConflictDoNothing()
      .run();
    tx.delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaType, t.type), eq(watchlist.tmdbId, t.tmdbId)))
      .run();
  });
  refresh();
}

/**
 * "Watched it earlier?": moves what you marked of this title in the last day to `when` (a "2024-05-01" day, up to
 * today) or to no date (null, "A while ago"). Inside the day the rows keep the show's order (season and episode as
 * milliseconds after noon UTC, the time imports use).
 */
export async function redateTitle(ref: TitleRef, when: string | null) {
  const userId = await requireUserId();
  const t = titleRef.parse(ref);
  const day = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => d >= "1900-01-01" && d <= new Date().toISOString().slice(0, 10) && !Number.isNaN(Date.parse(d)))
    .nullable()
    .parse(when);
  const noon = day === null ? null : Date.parse(`${day}T12:00:00Z`);
  await db
    .update(watched)
    .set({ watchedAt: noon === null ? null : sql`${noon} + ${watched.season} * 1000 + ${watched.episode}` })
    .where(
      and(
        eq(watched.userId, userId),
        eq(watched.mediaType, t.type),
        eq(watched.tmdbId, t.tmdbId),
        gte(watched.watchedAt, new Date(Date.now() - 86_400_000)),
      ),
    );
  refresh();
}

export type AddResult = {
  type: "movie" | "tv";
  id: number;
  title: string;
  meta: string;
  /** a small image URL to show, and the TMDB path to store */
  poster: string | null;
  posterPath: string | null;
  listed: boolean;
};

/** "Add a title" on the watchlist: search results with whether each one is already on your list. */
export async function findToAdd(raw: string): Promise<AddResult[]> {
  const query = z.string().trim().min(2).max(100).safeParse(raw);
  const session = await getSession();
  if (!query.success || !session) return [];
  const [cards, listed] = await Promise.all([
    searchTitles(query.data, await getLanguage()).catch(() => []),
    getMyWatchlistKeys(),
  ]);
  return cards.slice(0, 5).map((c) => ({
    type: c.media_type,
    id: c.id,
    title: c.title ?? c.name ?? "",
    meta: [c.media_type === "tv" ? "Series" : "Movie", (c.release_date ?? c.first_air_date ?? "").slice(0, 4)]
      .filter(Boolean)
      .join(" · "),
    poster: img(c.poster_path, "w92"),
    posterPath: c.poster_path,
    listed: listed?.has(`${c.media_type}-${c.id}`) ?? false,
  }));
}
