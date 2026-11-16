import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { importBatch as imports, rating, watched, watchlist } from "@/lib/db/schema";
import { getAiredEpisodes, getRuntime } from "@/lib/tmdb";
import { pool } from "@/lib/pool";
import { placeEpisodes, type ImportRow, type ImportSource } from "./importing";
import { linksFor, match, remember, row, type BatchResult, type Match, type Saved, type Unsure } from "./matching";
import { fromScore } from "./rating";

/*
 * What an import does, for a user the caller has already established: Settings' actions (your session) and the
 * extension's import route (its key). Never "use server" here: these take a user id, so they must not be callable
 * from a browser.
 */

/**
 * Saves matches. Already there stays as it is, so importing twice adds nothing. Watched beats watchlist.
 * A watched series means all of it: every episode aired so far, unless the row lists its episodes (Netflix).
 * Ratings come along (loved, liked, not for me). `missed`: Netflix episodes whose name TMDB doesn't know.
 */
export async function save(userId: string, matches: Match[], importId: string): Promise<Saved> {
  const seen = matches.filter((m) => m.row.list === "watched");
  const listed = matches.filter((m) => m.row.list === "watchlist");
  // runtimes so imported titles count in your hours (cached, most are looked up once)
  let missed = 0;
  const parts: { season: number; episode: number; minutes: number; date?: string; undated?: true }[][] = await pool(
    seen,
    8,
    async (m) => {
      if (m.type === "movie") return [{ season: 0, episode: 0, minutes: await getRuntime(m.id).catch(() => 0) }];
      const aired = await getAiredEpisodes(m.id).catch(() => []);
      if (!m.row.episodes) return aired;
      const placed = placeEpisodes(m.row.episodes, aired);
      missed += placed.missed;
      return placed.placed;
    },
  );
  // what came over: films, series and their episodes (watched = films + series)
  let films = 0;
  let series = 0;
  let episodes = 0;
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
            importId,
            // undated: a season marked watched in one go, the day isn't known ("A while ago")
            ...(p.undated
              ? { watchedAt: null }
              : (p.date ?? m.row.date)
                ? { watchedAt: new Date(`${p.date ?? m.row.date}T12:00:00Z`) }
                : {}),
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
          .set({ watchedAt: at })
          .where(
            and(
              eq(watched.userId, userId),
              eq(watched.mediaType, m.type),
              eq(watched.tmdbId, m.id),
              eq(watched.season, p.season),
              eq(watched.episode, p.episode),
              // past the end of that day (noon + 12 h), or none
              or(isNull(watched.watchedAt), gt(watched.watchedAt, new Date(at.getTime() + 12 * 3_600_000))),
            ),
          )
          .run();
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
  return { watched: films + series, films, series, episodes, watchlist: l, missed };
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
export async function runBatch(userId: string, raw: ImportRow[], rawImportId: string): Promise<BatchResult> {
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
  const unsure = results.filter((r): r is Unsure => r !== null && "candidates" in r);
  const saved = await save(userId, matches, importId);
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
