import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { watched, watchlist } from "@/lib/db/schema";
import { placeEpisodes } from "@/lib/library/importing";
import { linksFor, match, pick, remember, row, type Candidate, type Match } from "@/lib/library/matching";
import { getAiredEpisodes, getRuntime } from "@/lib/tmdb";

/**
 * What the extension sends when you finished something: the title as the site names it (with the site's ids, an
 * episode with its season, number and name), when you finished it, where, and your pick if it asked "Which one?".
 */
const markBody = z.object({
  row: row.refine((r) => r.list === "watched" && (r.type === "movie" || (r.episodes?.length ?? 0) <= 3)),
  at: z.iso.datetime().refine((d) => Date.parse(d) <= Date.now() + 5 * 60_000 && Date.parse(d) >= Date.UTC(2000, 0, 1)),
  via: z.enum(["Prime Video", "Netflix", "Crunchyroll"]),
  pick: pick.optional(),
});

export type MarkResult =
  | { status: "marked"; title: string; season?: number; episode?: number; ids: number[] }
  | { status: "already"; title: string }
  | { status: "pick"; candidates: Candidate[] }
  | { status: "unknown" };

/**
 * Marks a finished title for this user with its real time and `via`. A title it knows (by the site's id) or can tell
 * clearly goes in at once, an unclear one comes back to pick from (the pick is remembered), an episode is placed by
 * its number and name. A watch already there stays as it is: `ids` holds only what this mark created, for Undo.
 */
export async function markFromExtension(userId: string, raw: unknown): Promise<MarkResult> {
  const body = markBody.parse(raw);
  let m: Match;
  if (body.pick) {
    m = { row: body.row, ...body.pick };
  } else {
    const found = await match(body.row, await linksFor(userId, [body.row]));
    if (!found) return { status: "unknown" };
    if ("candidates" in found) return { status: "pick", candidates: found.candidates };
    m = found;
  }
  remember(userId, [m]);
  const parts =
    m.type === "movie"
      ? [{ season: 0, episode: 0, minutes: await getRuntime(m.id).catch(() => 0) }]
      : placeEpisodes(body.row.episodes ?? [], await getAiredEpisodes(m.id).catch(() => [])).placed;
  if (!parts.length) return { status: "unknown" };
  const at = new Date(body.at);
  const created = await db
    .insert(watched)
    .values(
      parts.map((p) => ({
        userId,
        mediaType: m.type,
        tmdbId: m.id,
        season: p.season,
        episode: p.episode,
        title: m.title,
        posterPath: m.posterPath,
        minutes: Math.min(p.minutes, 1000),
        watchedAt: at,
        via: body.via,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: watched.id });
  if (!created.length) return { status: "already", title: m.title };
  // like marking it in the app: it leaves the watchlist
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaType, m.type), eq(watchlist.tmdbId, m.id)));
  const first = parts[0];
  return {
    status: "marked",
    title: m.title,
    ...(m.type === "tv" && { season: first.season, episode: first.episode }),
    ids: created.map((c) => c.id),
  };
}

/** Undo in the extension's toast: removes exactly what that mark created (rows the extension made, by id) */
export async function undoMark(userId: string, raw: unknown) {
  const { ids } = z.object({ ids: z.array(z.number().int().positive()).min(1).max(3) }).parse(raw);
  await db.delete(watched).where(and(eq(watched.userId, userId), inArray(watched.id, ids), isNotNull(watched.via)));
}
