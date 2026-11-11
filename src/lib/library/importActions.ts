"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { watched, watchlist } from "@/lib/db/schema";
import { findByImdbId, getAiredEpisodes, getRuntime, img, searchForImport } from "@/lib/tmdb";
import { pickMatch, type Hit, type ImportRow } from "./importing";

// The browser sends rows read from your export, never the file. Batches stay small so each call is a few seconds.
const row = z.object({
  title: z.string().trim().min(1).max(300),
  year: z.number().int().min(1870).max(2100).optional(),
  imdbId: z
    .string()
    .regex(/^tt\d{5,10}$/)
    .optional(),
  type: z.enum(["movie", "tv"]),
  list: z.enum(["watched", "watchlist"]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
const pick = z.object({
  id: z.number().int().positive(),
  type: z.enum(["movie", "tv"]),
  title: z.string().trim().min(1).max(300),
  posterPath: z
    .string()
    .regex(/^\/[\w.-]+$/)
    .nullable(),
});

/** `poster` is the small image to show, `posterPath` what gets stored */
export type Candidate = Hit & { type: "movie" | "tv"; posterPath: string | null; poster: string | null };
export type Unsure = { row: ImportRow; candidates: Candidate[] };
export type BatchResult = { watched: number; watchlist: number; notFound: number; unsure: Unsure[] };
type Match = { row: ImportRow; id: number; type: "movie" | "tv"; title: string; posterPath: string | null };

const yearOf = (date?: string) => (date ? Number(date.slice(0, 4)) || undefined : undefined);

/** IMDb rows by their id (exact). Letterboxd rows by title search, then title and year decide (or ask). */
async function match(r: ImportRow): Promise<Match | Unsure | null> {
  if (r.imdbId) {
    const t = await findByImdbId(r.imdbId).catch(() => null);
    if (!t) return null;
    return { row: r, id: t.id, type: t.media_type, title: t.title ?? t.name ?? r.title, posterPath: t.poster_path };
  }
  const hits = await searchForImport(r.title).catch(() => []);
  if (!hits.length) return null;
  const m = pickMatch(
    r,
    hits.map((h) => ({ ...h, year: yearOf(h.date) })),
  );
  if ("match" in m) {
    const h = m.match;
    return { row: r, id: h.id, type: h.type, title: h.title, posterPath: h.posterPath };
  }
  return {
    row: r,
    candidates: m.candidates.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      year: c.year,
      posterPath: c.posterPath,
      poster: img(c.posterPath, "w92"),
    })),
  };
}

/** Runs `fn` over `items`, `n` at a time (TMDB is fine with that, and it keeps a batch to a few seconds). */
async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * Saves matches. Already there stays as it is, so importing twice adds nothing. Watched beats watchlist.
 * A watched series means all of it: every episode aired so far.
 */
async function save(userId: string, matches: Match[]) {
  const seen = matches.filter((m) => m.row.list === "watched");
  const listed = matches.filter((m) => m.row.list === "watchlist");
  // runtimes so imported titles count in your hours (cached, most are looked up once)
  const parts = await pool(seen, 8, async (m) =>
    m.type === "movie"
      ? [{ season: 0, episode: 0, minutes: await getRuntime(m.id).catch(() => 0) }]
      : await getAiredEpisodes(m.id).catch(() => []),
  );
  let w = 0;
  let l = 0;
  db.transaction((tx) => {
    seen.forEach((m, i) => {
      if (!parts[i].length) return;
      // a series counts once however many episodes it brings
      const added = tx
        .insert(watched)
        .values(
          parts[i].map((p) => ({
            userId,
            mediaType: m.type,
            tmdbId: m.id,
            season: p.season,
            episode: p.episode,
            title: m.title,
            posterPath: m.posterPath,
            minutes: Math.min(p.minutes, 1000),
            ...(m.row.date ? { watchedAt: new Date(`${m.row.date}T12:00:00Z`) } : {}),
          })),
        )
        .onConflictDoNothing()
        .run().changes;
      if (added) w++;
      // like marking it watched in the app: it leaves the watchlist
      tx.delete(watchlist)
        .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaType, m.type), eq(watchlist.tmdbId, m.id)))
        .run();
    });
    for (const m of listed) {
      const already = tx
        .select({ id: watched.id })
        .from(watched)
        .where(and(eq(watched.userId, userId), eq(watched.mediaType, m.type), eq(watched.tmdbId, m.id)))
        .get();
      if (already) continue;
      l += tx
        .insert(watchlist)
        .values({
          userId,
          mediaType: m.type,
          tmdbId: m.id,
          title: m.title,
          posterPath: m.posterPath,
          ...(m.row.date ? { addedAt: new Date(`${m.row.date}T12:00:00Z`) } : {}),
        })
        .onConflictDoNothing()
        .run().changes;
    }
  });
  return { watched: w, watchlist: l };
}

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Sign in to import.");
  return session.user.id;
}

/** One batch of rows from an export: matched ones are saved, unclear ones come back with candidates. */
export async function importBatch(raw: ImportRow[]): Promise<BatchResult> {
  const userId = await requireUserId();
  const rows = z.array(row).max(200).parse(raw);
  const results = await pool(rows, 8, match);
  const matches = results.filter((r): r is Match => r !== null && "id" in r);
  const unsure = results.filter((r): r is Unsure => r !== null && "candidates" in r);
  const saved = await save(userId, matches);
  refresh();
  return { ...saved, notFound: results.filter((r) => r === null).length, unsure };
}

/** You picked which title an unclear row meant. */
export async function importPick(rawRow: ImportRow, rawPick: z.input<typeof pick>) {
  const userId = await requireUserId();
  const r = row.parse(rawRow);
  const p = pick.parse(rawPick);
  const saved = await save(userId, [{ row: r, id: p.id, type: p.type, title: p.title, posterPath: p.posterPath }]);
  refresh();
  return saved;
}
