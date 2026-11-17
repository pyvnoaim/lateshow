import "server-only";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { rewatch, watched, watchlist } from "@/lib/db/schema";
import { placeEpisodes } from "@/lib/library/importing";
import { isRewatch } from "@/lib/library/rewatch";
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
  | { status: "marked"; title: string; season?: number; episode?: number; ids: number[]; rewatch?: boolean }
  | { status: "already"; title: string }
  | { status: "pick"; candidates: Candidate[] }
  | { status: "unknown" };

/**
 * Marks a finished title for this user with its real time and `via`. A title it knows (by the site's id) or can tell
 * clearly goes in at once, an unclear one comes back to pick from (the pick is remembered), an episode is placed by
 * its number and name. An episode already watched more than 2 days away from this becomes a rewatch, closer it's the
 * same viewing and nothing changes. `ids` holds only what this mark created, for Undo (a rewatch's as a negative id).
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
    .returning({ id: watched.id, season: watched.season, episode: watched.episode });
  const again = rewatches(
    userId,
    m,
    parts.filter((p) => !created.some((c) => c.season === p.season && c.episode === p.episode)),
    at,
    body.via,
  );
  if (!created.length && !again.length) return { status: "already", title: m.title };
  // like marking it in the app: it leaves the watchlist
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaType, m.type), eq(watchlist.tmdbId, m.id)));
  const first = parts[0];
  return {
    status: "marked",
    title: m.title,
    ...(m.type === "tv" && { season: first.season, episode: first.episode }),
    ids: [...created.map((c) => c.id), ...again.map((id) => -id)],
    ...(!created.length && { rewatch: true }),
  };
}

/**
 * The rewatches among parts already watched: each gets a row unless one of its viewings is within 2 days of `at`.
 * One synchronous transaction, so two marks of one viewing arriving together can't both add it.
 */
function rewatches(userId: string, m: Match, parts: { season: number; episode: number }[], at: Date, via: string) {
  if (!parts.length) return [];
  return db.transaction((tx) => {
    const firsts = tx
      .select({ id: watched.id, at: watched.watchedAt })
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
    const fresh = firsts.filter((f) => isRewatch(at, [f.at, ...later.filter((l) => l.of === f.id).map((l) => l.at)]));
    if (!fresh.length) return [];
    return tx
      .insert(rewatch)
      .values(fresh.map((f) => ({ watchedId: f.id, userId, watchedAt: at, via })))
      .returning({ id: rewatch.id })
      .all()
      .map((r) => r.id);
  });
}

/** Undo in the extension's toast: removes exactly what that mark created (rows the extension made, by id) */
export async function undoMark(userId: string, raw: unknown) {
  const { ids } = z
    .object({
      ids: z
        .array(
          z
            .number()
            .int()
            .refine((n) => n !== 0),
        )
        .min(1)
        .max(3),
    })
    .parse(raw);
  const firsts = ids.filter((id) => id > 0);
  const again = ids.filter((id) => id < 0).map((id) => -id);
  if (firsts.length)
    await db
      .delete(watched)
      .where(and(eq(watched.userId, userId), inArray(watched.id, firsts), isNotNull(watched.via)));
  if (again.length) await db.delete(rewatch).where(and(eq(rewatch.userId, userId), inArray(rewatch.id, again)));
}
