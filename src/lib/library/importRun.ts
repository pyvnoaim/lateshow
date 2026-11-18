import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { importBatch as imports, rating, rewatch, watched, watchlist } from "@/lib/db/schema";
import { getAiredEpisodes, getRuntime } from "@/lib/tmdb";
import { pool } from "@/lib/pool";
import { placeEpisodes, type ImportRow, type ImportSource } from "./importing";
import { linksFor, match, remember, row, type BatchResult, type Match, type Saved, type Unsure } from "./matching";
import { fromScore } from "./rating";
import { isRewatch } from "./rewatch";

/*
 * What an import does, for a user the caller has already established: Settings' actions (your session) and the
 * extension's import route (its key). Never "use server" here: these take a user id, so they must not be callable
 * from a browser.
 */

/**
 * Saves matches. Already there stays as it is, so importing twice adds nothing. Watched beats watchlist.
 * A watched series means all of it: every episode aired so far, unless the row lists its episodes (Netflix).
 * Ratings come along (loved, liked, not for me). `missed`: Netflix episodes whose name TMDB doesn't know.
 * `via` (a sync from the extension): an episode the site says you finished, already watched on another day, is a
 * rewatch. Files never add rewatches: they can't tell finished from started.
 */
export async function save(userId: string, matches: Match[], importId: string, via?: string): Promise<Saved> {
  const seen = matches.filter((m) => m.row.list === "watched");
  const listed = matches.filter((m) => m.row.list === "watchlist");
  // runtimes so imported titles count in your hours (cached, most are looked up once)
  let missed = 0;
  const parts: {
    season: number;
    episode: number;
    minutes: number;
    date?: string;
    undated?: true;
    finished?: true;
    at?: number;
  }[][] = await pool(seen, 8, async (m) => {
    if (m.type === "movie")
      return [
        {
          season: 0,
          episode: 0,
          minutes: await getRuntime(m.id).catch(() => 0),
          ...(m.row.at && { at: m.row.at }),
          ...(m.row.finished && { finished: true as const }),
        },
      ];
    const aired = await getAiredEpisodes(m.id).catch(() => []);
    if (!m.row.episodes) return aired;
    const placed = placeEpisodes(m.row.episodes, aired);
    missed += placed.missed;
    return placed.placed;
  });
  // what came over: films, series and their episodes (watched = films + series)
  let films = 0;
  let series = 0;
  let episodes = 0;
  let l = 0;
  let rewatches = 0;
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
            importId,
            // undated: a season marked watched in one go, the day isn't known ("A while ago")
            ...(p.undated ? { watchedAt: null } : when(p, m) ? { watchedAt: when(p, m) } : {}),
          })),
        )
        .onConflictDoNothing()
        .run().changes;
      // already there with a later day (marked by hand = the day you clicked) or no day ("A while ago"): the site's
      // real day replaces it. A same-day time stays (the extension's 21:40 beats the import's noon), an earlier day
      // you picked stays too
      for (const p of parts[i]) {
        const day = p.undated ? undefined : (p.date ?? m.row.date);
        if (!day) continue;
        const at = new Date(`${day}T12:00:00Z`);
        tx.update(watched)
          .set({ watchedAt: when(p, m) })
          .where(
            and(
              eq(watched.userId, userId),
              eq(watched.mediaType, m.type),
              eq(watched.tmdbId, m.id),
              eq(watched.season, p.season),
              eq(watched.episode, p.episode),
              // past the end of that day (noon + 12 h), or none
              // or an import's noon on that day, when a sync now knows the real time
              or(
                isNull(watched.watchedAt),
                gt(watched.watchedAt, new Date(at.getTime() + 12 * 3_600_000)),
                p.at ? eq(watched.watchedAt, at) : undefined,
              ),
            ),
          )
          .run();
      }
      // after the days above are settled, so the same viewing on a corrected day is never a rewatch of itself
      if (via) {
        const again = parts[i].flatMap((p) => {
          const at = p.finished && !p.undated ? when(p, m) : undefined;
          return at ? [{ ...p, at }] : [];
        });
        rewatches += addRewatches(tx, userId, m, again, via, importId).length;
      }
      if (added && m.type === "movie") films++;
      else if (added) {
        series++;
        episodes += added;
      }
      // a rating from the export, unless you already rated it here
      const value = m.row.score ? fromScore(m.row.score) : undefined;
      if (value)
        tx.insert(rating)
          .values({ userId, mediaType: m.type, tmdbId: m.id, value, importId })
          .onConflictDoNothing()
          .run();
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
          importId,
          ...(m.row.date ? { addedAt: new Date(`${m.row.date}T12:00:00Z`) } : {}),
        })
        .onConflictDoNothing()
        .run().changes;
    }
  });
  // a rewatch counts with the episodes it brought
  return { watched: films + series, films, series, episodes: episodes + rewatches, watchlist: l, missed };
}

/** When a part was watched: the site's real time (a sync), else noon on its day, none without a day */
function when(p: { date?: string; at?: number }, m: Match) {
  if (p.at) return new Date(p.at);
  const day = p.date ?? m.row.date;
  return day ? new Date(`${day}T12:00:00Z`) : undefined;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Rewatches of what's already watched: each viewing gets a row unless one of that episode's viewings (the first, the
 * rewatches, one added just before in this call) is within 2 days. Inside the caller's transaction, so two of the
 * same viewing arriving together can't both add it. Returns the new rewatch ids.
 */
export function addRewatches(
  tx: Tx,
  userId: string,
  m: { type: "movie" | "tv"; id: number },
  parts: { season: number; episode: number; at: Date }[],
  via: string,
  importId?: string,
): number[] {
  if (!parts.length) return [];
  const firsts = tx
    .select({ id: watched.id, at: watched.watchedAt, season: watched.season, episode: watched.episode })
    .from(watched)
    .where(
      and(
        eq(watched.userId, userId),
        eq(watched.mediaType, m.type),
        eq(watched.tmdbId, m.id),
        or(...parts.map((p) => and(eq(watched.season, p.season), eq(watched.episode, p.episode)))),
      ),
    )
    .all();
  if (!firsts.length) return [];
  const later = tx
    .select({ of: rewatch.watchedId, at: rewatch.watchedAt })
    .from(rewatch)
    .where(
      inArray(
        rewatch.watchedId,
        firsts.map((f) => f.id),
      ),
    )
    .all();
  const ids: number[] = [];
  for (const p of parts) {
    const f = firsts.find((x) => x.season === p.season && x.episode === p.episode);
    if (!f || !isRewatch(p.at, [f.at, ...later.filter((l) => l.of === f.id).map((l) => l.at)])) continue;
    const r = tx
      .insert(rewatch)
      .values({ watchedId: f.id, userId, watchedAt: p.at, via, importId })
      .returning({ id: rewatch.id })
      .get();
    later.push({ of: f.id, at: p.at });
    ids.push(r.id);
  }
  return ids;
}

const SOURCES = ["Prime Video", "Letterboxd", "IMDb", "Netflix", "Crunchyroll"] as const satisfies ImportSource[];

/** Starts an import run: everything it adds carries this id, so Settings can remove it again as a whole. */
export async function startImportFor(userId: string, source: ImportSource): Promise<string> {
  const id = randomBytes(12).toString("base64url");
  await db.insert(imports).values({ id, userId, source: z.enum(SOURCES).parse(source) });
  return id;
}

/** The run's id, if it's yours */
export async function ownBatch(userId: string, raw: unknown) {
  const id = z.string().min(8).max(40).parse(raw);
  const b = await db
    .select({ id: imports.id })
    .from(imports)
    .where(and(eq(imports.id, id), eq(imports.userId, userId)))
    .get();
  if (!b) throw new Error("This import isn't yours.");
  return id;
}

/** One batch of rows from an export: matched ones are saved, unclear ones come back with candidates (and wait with the import). */
/** `via`: a sync from the extension (rewatches allowed, see `save`) */
export async function runBatch(
  userId: string,
  raw: ImportRow[],
  rawImportId: string,
  via?: string,
): Promise<BatchResult> {
  const importId = await ownBatch(userId, rawImportId);
  // a batch holds at most 6000 episodes in all, so one call can't keep the server matching names for long
  const rows = z
    .array(row)
    .max(200)
    .refine((rs) => rs.reduce((n, r) => n + (r.episodes?.length ?? 0), 0) <= 6000)
    .parse(raw);
  const links = await linksFor(userId, rows);
  const results = await pool(rows, 8, (r) => match(r, links));
  const matches = results.filter((r): r is Match => r !== null && "id" in r);
  let unsure = results.filter((r): r is Unsure => r !== null && "candidates" in r);
  // a sync reads the last days again: what you skipped before isn't asked again (a file import asks, you chose it)
  if (via && unsure.length) {
    const skipped = new Set(
      (
        await db
          .select({ skipped: imports.skipped })
          .from(imports)
          .where(and(eq(imports.userId, userId), isNotNull(imports.skipped)))
      ).flatMap((b) => b.skipped ?? []),
    );
    unsure = unsure.filter((u) => !skipped.has(skipKey(u.row)));
  }
  const saved = await save(userId, matches, importId, via);
  remember(userId, matches);
  // a title asked about before and read again now (the next sync) is settled by this answer, not asked twice
  const seen = new Set(rows.map(openKey));
  const older = await db
    .select({ id: imports.id, open: imports.open })
    .from(imports)
    .where(and(eq(imports.userId, userId), isNotNull(imports.open)));
  for (const b of older)
    if ((b.open as Unsure[]).some((u) => seen.has(openKey(u.row))))
      await keepOpen(b.id, (open) => open.filter((u) => !seen.has(openKey(u.row))));
  if (unsure.length) await keepOpen(importId, (open) => [...open, ...unsure]);
  return {
    ...saved,
    notFound: results.filter((r) => r === null).length,
    unsure,
  };
}

// a skipped title, whatever day it was read on
export const skipKey = (r: ImportRow) => `${r.type}|${r.title}|${r.year ?? ""}`;

/** Remembers a skipped unclear row with its import (which must be yours, checked by the caller) */
export function rememberSkip(importId: string, r: ImportRow) {
  db.transaction((tx) => {
    const b = tx.select({ skipped: imports.skipped }).from(imports).where(eq(imports.id, importId)).get();
    tx.update(imports)
      .set({ skipped: [...new Set([...(b?.skipped ?? []), skipKey(r)])] })
      .where(eq(imports.id, importId))
      .run();
  });
}

// which unclear row is which (a pick or skip sends the row back)
export const openKey = (r: ImportRow) => `${r.type}|${r.title}|${r.year ?? ""}|${r.date ?? ""}`;

/** Changes the unclear rows an import keeps waiting (the import must be yours, checked by the caller) */
// one synchronous transaction: picks clicked in quick succession can't overwrite each other's change
export async function keepOpen(importId: string, change: (open: Unsure[]) => Unsure[]) {
  db.transaction((tx) => {
    const b = tx.select({ open: imports.open }).from(imports).where(eq(imports.id, importId)).get();
    const next = change((b?.open ?? []) as Unsure[]);
    tx.update(imports)
      .set({ open: next.length ? next : null })
      .where(eq(imports.id, importId))
      .run();
  });
}
