import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userServices } from "@/lib/db/schema";
import { discoverPicks, searchKeywordIds, type MediaType } from "@/lib/tmdb";
import { isEmptyMood, parseMood } from "./mood";
import { roomServices, seededShuffle } from "./swipe";

/** Discover filters for a mood and a type. Words we don't know go through TMDB's keyword search. */
async function moodParams(mood: string, kind: MediaType): Promise<Record<string, string>> {
  const q = parseMood(mood);
  const params: Record<string, string> = {};
  const genres = kind === "movie" ? q.movieGenres : q.tvGenres;
  if (genres.length > 0) params.with_genres = genres.join("|");
  if (kind === "movie" && q.maxMinutes) params["with_runtime.lte"] = String(q.maxMinutes);
  const date = kind === "movie" ? "primary_release_date" : "first_air_date";
  if (q.from) params[`${date}.gte`] = q.from;
  if (q.to) params[`${date}.lte`] = q.to;
  if (isEmptyMood(q)) {
    const keywords = await searchKeywordIds(mood).catch(() => []);
    if (keywords.length > 0) params.with_keywords = keywords.join("|");
  }
  return params;
}

/**
 * Three picks for a mood from the services the room shares (see roomServices), the same three for everyone.
 * Too few on those services: from any subscription in the country instead.
 */
export async function pickForMood(code: string, kind: MediaType, mood: string, memberIds: string[], country: string) {
  const perPerson = await Promise.all(
    memberIds.map((id) =>
      db
        .select({ id: userServices.providerId })
        .from(userServices)
        .where(eq(userServices.userId, id))
        .then((rows) => rows.map((r) => r.id)),
    ),
  );
  const services = roomServices(perPerson);
  const params = await moodParams(mood, kind);
  let pool = await discoverPicks(kind, params, country, services).catch(() => []);
  if (pool.length < 3) pool = await discoverPicks(kind, params, country).catch(() => []);
  return {
    services,
    deck: seededShuffle(
      pool.slice(0, 20).map((c) => c.id),
      `${code}:${mood}`,
    ).slice(0, 3),
  };
}
