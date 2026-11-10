"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { watched, watchlist } from "@/lib/db/schema";

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
