import "server-only";
import { cacheLife } from "next/cache";
import { env } from "./env";

export type MediaType = "movie" | "tv";
export const COUNTRY = "DE"; // ponytail: fixed for now, make it a user setting with layer 2

const API = "https://api.themoviedb.org/3";

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = `${API}${path}?${new URLSearchParams({ language: "en-US", ...params })}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env("tmdb").TMDB_TOKEN}` } });
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json();
}

export const img = (path: string | null | undefined, size: string) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

export type Card = {
  id: number;
  media_type: MediaType;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
};

export type Episode = {
  episode_number: number;
  name: string;
  vote_average: number;
  still_path: string | null;
  runtime: number | null;
};

export type Title = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  genres: { name: string }[];
  vote_average: number;
  seasons?: { season_number: number; episode_count: number }[];
  credits: { cast: { id: number; name: string; character: string; profile_path: string | null }[] };
  videos: { results: { key: string; site: string; type: string; official: boolean }[] };
  recommendations: { results: Card[] };
  "watch/providers": { results: Record<string, { link: string } | undefined> };
  release_dates?: { results: { iso_3166_1: string; release_dates: { type: number; release_date: string }[] }[] };
};

export type Video = Title["videos"]["results"][number];

/** Official YouTube trailer first, any YouTube trailer second. */
export function pickTrailer(videos: Video[]) {
  const trailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer");
  return trailers.find((v) => v.official) ?? trailers[0];
}

/**
 * Cinema release in COUNTRY as YYYY-MM-DD: theatrical (3) before limited (2), earliest first.
 * Falls back to TMDB's main release date when the country has none.
 */
export function cinemaDate(t: Pick<Title, "release_date" | "release_dates">, country = COUNTRY) {
  const dates =
    t.release_dates?.results
      .find((r) => r.iso_3166_1 === country)
      ?.release_dates.filter((d) => d.type === 3 || d.type === 2)
      .toSorted((a, b) => a.type - b.type || a.release_date.localeCompare(b.release_date)) ?? [];
  return (dates.find((d) => d.type === 3) ?? dates[0])?.release_date.slice(0, 10) ?? t.release_date ?? null;
}

export type Kind = MediaType | "all";

export async function getTrending(kind: Kind = "all") {
  "use cache";
  cacheLife("hours");
  const data = await tmdb<{ results: Card[] }>(`/trending/${kind}/week`);
  return data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

/**
 * Well rated titles that are on a subscription service in COUNTRY, one page of results.
 * Feeds "Can't decide?". Discover results have no media_type, so it's added here.
 */
export async function discoverOnSubscription(type: MediaType, page: number): Promise<Card[]> {
  "use cache";
  cacheLife("days");
  const data = await tmdb<{ results: Omit<Card, "media_type">[] }>(`/discover/${type}`, {
    watch_region: COUNTRY,
    with_watch_monetization_types: "flatrate",
    "vote_average.gte": "7",
    "vote_count.gte": "300",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return data.results.map((r) => ({ ...r, media_type: type }));
}

export async function getTitle(type: MediaType, id: string) {
  "use cache";
  cacheLife("days");
  return tmdb<Title>(`/${type}/${id}`, {
    append_to_response: "credits,videos,recommendations,watch/providers,release_dates",
  });
}

export async function getSeasons(id: string, numbers: number[]) {
  "use cache";
  cacheLife("days");
  // ponytail: one request per season, fine with the day-long cache. Shows with 30+ seasons would want batching.
  return Promise.all(
    numbers.map(async (n) => ({
      number: n,
      episodes: (await tmdb<{ episodes: Episode[] }>(`/tv/${id}/season/${n}`)).episodes,
    })),
  );
}

export type SearchHit = Card | { media_type: "person"; known_for?: Card[] };

/** Movies and series matching the query. A person match adds the titles they're known for. */
export async function searchTitles(query: string) {
  "use cache";
  cacheLife("hours");
  const data = await tmdb<{ results: SearchHit[] }>("/search/multi", { query, include_adult: "false" });
  return toCards(data.results);
}

/** Flattens people into their known titles, keeps only movies and series, drops duplicates (first one wins). */
export function toCards(hits: SearchHit[]): Card[] {
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const hit of hits.flatMap((h) => (h.media_type === "person" ? (h.known_for ?? []) : [h]))) {
    const key = `${hit.media_type}-${hit.id}`;
    if ((hit.media_type === "movie" || hit.media_type === "tv") && !seen.has(key)) {
      seen.add(key);
      cards.push(hit);
    }
  }
  return cards;
}

/**
 * Movies coming to cinemas in COUNTRY from today on, soonest first, with their trailer.
 * One cached call per movie for the German date and trailer, refreshed every few hours.
 */
export async function getUpcomingInCinemas() {
  "use cache";
  cacheLife("hours");
  const today = new Date().toISOString().slice(0, 10);
  const data = await tmdb<{ results: Omit<Card, "media_type">[] }>("/movie/upcoming", { region: COUNTRY });
  const movies = await Promise.all(
    data.results.map(async (m) => {
      const t = await getTitle("movie", String(m.id)).catch(() => null);
      return t
        ? {
            card: { ...m, media_type: "movie" as const },
            date: cinemaDate(t),
            trailer: pickTrailer(t.videos.results)?.key,
          }
        : null;
    }),
  );
  return movies
    .filter((m): m is NonNullable<typeof m> => m !== null && m.date !== null && m.date >= today)
    .toSorted((a, b) => a.date!.localeCompare(b.date!));
}
