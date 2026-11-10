import { cacheLife } from "next/cache";

export type MediaType = "movie" | "tv";
export const COUNTRY = "DE"; // ponytail: fixed for now, make it a user setting with layer 2

const API = "https://api.themoviedb.org/3";

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_TOKEN;
  if (!token) throw new Error("TMDB_TOKEN is missing. Put your TMDB read access token in .env.local");
  const url = `${API}${path}?${new URLSearchParams({ language: "en-US", ...params })}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
};

export async function getTrending() {
  "use cache";
  cacheLife("hours");
  const data = await tmdb<{ results: Card[] }>("/trending/all/week");
  return data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getTitle(type: MediaType, id: string) {
  "use cache";
  cacheLife("days");
  return tmdb<Title>(`/${type}/${id}`, { append_to_response: "credits,videos,recommendations,watch/providers" });
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
