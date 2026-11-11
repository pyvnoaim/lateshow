import "server-only";
import { desc, eq, max } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db/client";
import { watched } from "@/lib/db/schema";
import { getTitle } from "@/lib/tmdb";
import { tasteMatch, type Taste } from "./match";

// Genres come from the most recent titles only: enough for a profile, and each lookup is cached TMDB data.
const GENRE_SAMPLE = 40;

/** Someone's watched titles (newest first, each once) and their genre counts. One per request per user. */
export const getTaste = cache(async (userId: string) => {
  const last = max(watched.watchedAt);
  const titles = await db
    .select({
      mediaType: watched.mediaType,
      tmdbId: watched.tmdbId,
      title: watched.title,
      posterPath: watched.posterPath,
      last,
    })
    .from(watched)
    .where(eq(watched.userId, userId))
    .groupBy(watched.mediaType, watched.tmdbId)
    .orderBy(desc(last));
  const genres = new Map<number, number>();
  const details = await Promise.all(
    titles.slice(0, GENRE_SAMPLE).map((t) => getTitle(t.mediaType, String(t.tmdbId)).catch(() => null)),
  );
  for (const d of details) for (const g of d?.genres ?? []) genres.set(g.id, (genres.get(g.id) ?? 0) + 1);
  const taste: Taste = { titles: new Set(titles.map((t) => `${t.mediaType}-${t.tmdbId}`)), genres };
  return { ...taste, list: titles };
});

/** Your match with someone (null until you both watched enough) and the titles you both watched, theirs newest first. */
export async function getMatch(me: string, them: string) {
  const [mine, theirs] = await Promise.all([getTaste(me), getTaste(them)]);
  return {
    percent: tasteMatch(mine, theirs),
    both: theirs.list.filter((t) => mine.titles.has(`${t.mediaType}-${t.tmdbId}`)),
  };
}
