import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { titleLink } from "@/lib/db/schema";
import { findByImdbId, getAiredEpisodes, img, searchForImport } from "@/lib/tmdb";
import { norm, pickMatch, placeEpisodes, type Hit, type ImportRow } from "./importing";

/**
 * Matching a row from an export (or the extension) to a TMDB title, shared by the import and the extension's marks.
 * Not a "use server" file on purpose: everything exported there becomes a callable action.
 */

// The browser sends rows read from your export, never the file. Batches stay small so each call is a few seconds.
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const row = z.object({
  title: z.string().trim().min(1).max(300),
  year: z.number().int().min(1870).max(2100).optional(),
  imdbId: z
    .string()
    .regex(/^tt\d{5,10}$/)
    .optional(),
  type: z.enum(["movie", "tv"]),
  list: z.enum(["watched", "watchlist"]),
  date: day.optional(),
  score: z.number().min(0).max(10).optional(),
  refs: z
    .array(z.string().regex(/^[a-z]+:[\w.:-]{1,120}$/))
    .max(200)
    .optional(),
  episodes: z
    .array(
      z.object({
        season: z.number().int().min(0).max(500).optional(),
        episode: z.number().int().min(0).max(100000).optional(),
        name: z.string().trim().min(1).max(300),
        date: day.optional(),
      }),
    )
    .max(5000)
    .optional(),
});
export const pick = z.object({
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
export type Saved = {
  watched: number;
  films: number;
  series: number;
  episodes: number;
  watchlist: number;
  missed: number;
};
export type BatchResult = Saved & { notFound: number; unsure: Unsure[] };
export type Match = { row: ImportRow; id: number; type: "movie" | "tv"; title: string; posterPath: string | null };

const yearOf = (date?: string) => (date ? Number(date.slice(0, 4)) || undefined : undefined);

export type Links = Map<string, { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }>;

/** Your remembered matches for these site ids (see titleLink) */
export async function linksFor(userId: string, rows: ImportRow[]): Promise<Links> {
  const refs = [...new Set(rows.flatMap((r) => r.refs ?? []))];
  if (!refs.length) return new Map();
  const found = await db
    .select()
    .from(titleLink)
    .where(and(eq(titleLink.userId, userId), inArray(titleLink.ref, refs)));
  return new Map(
    found.map((l) => [l.ref, { id: l.tmdbId, type: l.mediaType, title: l.title, posterPath: l.posterPath }]),
  );
}

/** Remembers matches by the site's ids, a pick overrides an earlier one */
export function remember(userId: string, matches: Match[]) {
  const rows = matches.flatMap((m) =>
    (m.row.refs ?? []).map((ref) => ({
      userId,
      ref,
      mediaType: m.type,
      tmdbId: m.id,
      title: m.title,
      posterPath: m.posterPath,
    })),
  );
  if (!rows.length) return;
  db.insert(titleLink)
    .values(rows)
    .onConflictDoUpdate({
      target: [titleLink.userId, titleLink.ref],
      set: {
        mediaType: sql`excluded.media_type`,
        tmdbId: sql`excluded.tmdb_id`,
        title: sql`excluded.title`,
        posterPath: sql`excluded.poster_path`,
      },
    })
    .run();
}

/**
 * A title you matched before (its site id remembered) skips everything. IMDb rows by their id (exact). The rest by
 * title search, then title and year decide (or ask).
 */
export async function match(r: ImportRow, links: Links = new Map()): Promise<Match | Unsure | null> {
  const known = r.refs?.map((ref) => links.get(ref)).find(Boolean);
  if (known) return { row: r, ...known };
  if (r.imdbId) {
    const t = await findByImdbId(r.imdbId).catch(() => null);
    if (!t) return null;
    return { row: r, id: t.id, type: t.media_type, title: t.title ?? t.name ?? r.title, posterPath: t.poster_path };
  }
  // Netflix episodes only fit a series
  const find = async (q: string) =>
    (await searchForImport(q).catch(() => [])).filter((h) => !r.episodes || h.type === "tv");
  let hits = await find(r.title);
  // "Jack in the Box 2 - Awakening", "Sharknado - More Sharks, More 'Nado!": a subtitle TMDB writes otherwise.
  // Nothing found: the part before it, and with no exact name that's always a pick, never a guess
  if (!hits.length && r.title.includes(" - ")) hits = await find(r.title.split(" - ")[0]);
  if (!hits.length) return null;
  const m = pickMatch(
    r,
    hits.map((h) => ({ ...h, year: yearOf(h.date) })),
  );
  if ("match" in m) {
    const h = m.match;
    return { row: r, id: h.id, type: h.type, title: h.title, posterPath: h.posterPath };
  }
  // Netflix has no year, but its episode names tell remakes apart: the one show whose episodes fit wins
  if (r.episodes) {
    const fits = await Promise.all(
      m.candidates.map(
        async (c) => placeEpisodes(r.episodes!, await getAiredEpisodes(c.id).catch(() => [])).placed.length,
      ),
    );
    const best = Math.max(...fits);
    if (best > 0 && fits.filter((f) => f === best).length === 1) {
      const h = m.candidates[fits.indexOf(best)];
      return { row: r, id: h.id, type: h.type, title: h.title, posterPath: h.posterPath };
    }
  }
  // ponytail: no year at all (Netflix): TMDB's top hit with that exact name that was out when you watched it.
  // Mostly right (Knives Out 2019, not 2016), a wrong one is fixed on the title page. Ask instead if it bites.
  if (!r.year && r.date) {
    const seen = yearOf(r.date)!;
    const h = m.candidates.find((c) => !c.year || c.year <= seen);
    if (h && norm(h.title) === norm(r.title))
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
