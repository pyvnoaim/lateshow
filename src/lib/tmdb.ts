import "server-only";
import { cacheLife } from "next/cache";
import { env } from "./env";

export type MediaType = "movie" | "tv";

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
  genre_ids?: number[];
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
  "watch/providers": {
    results: Record<
      string,
      { link: string; flatrate?: { provider_id: number; provider_name: string; logo_path: string }[] } | undefined
    >;
  };
  images?: { logos: { file_path: string; iso_639_1: string | null; aspect_ratio: number }[] };
  next_episode_to_air?: { air_date: string; season_number: number; episode_number: number; name: string } | null;
  release_dates?: { results: { iso_3166_1: string; release_dates: { type: number; release_date: string }[] }[] };
};

export type Video = Title["videos"]["results"][number];

/** Official YouTube trailer first, any YouTube trailer second. */
export function pickTrailer(videos: Video[]) {
  const trailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer");
  return trailers.find((v) => v.official) ?? trailers[0];
}

/**
 * Cinema release in the country as YYYY-MM-DD: theatrical (3) before limited (2), earliest first.
 * Falls back to TMDB's main release date when the country has none.
 */
export function cinemaDate(t: Pick<Title, "release_date" | "release_dates">, country: string) {
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
 * Well rated titles that are on a subscription service in the country, one page of results.
 * Feeds "Can't decide?". Discover results have no media_type, so it's added here.
 */
export async function discoverOnSubscription(type: MediaType, page: number, country: string): Promise<Card[]> {
  "use cache";
  cacheLife("days");
  const data = await tmdb<{ results: Omit<Card, "media_type">[] }>(`/discover/${type}`, {
    watch_region: country,
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
    append_to_response: "credits,videos,recommendations,watch/providers,release_dates,images",
    include_image_language: "en,null",
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
 * Movies coming to cinemas in the country from today on, soonest first, with their trailer.
 * One cached call per movie for the German date and trailer, refreshed every few hours.
 */
export async function getUpcomingInCinemas(country: string) {
  "use cache";
  cacheLife("hours");
  const today = new Date().toISOString().slice(0, 10);
  const pages = await Promise.all(
    [1, 2].map((page) =>
      tmdb<{ results: Omit<Card, "media_type">[] }>("/movie/upcoming", { region: country, page: String(page) }),
    ),
  );
  const unique = [...new Map(pages.flatMap((p) => p.results).map((m) => [m.id, m])).values()];
  const movies = await Promise.all(
    unique.map(async (m) => {
      const t = await getTitle("movie", String(m.id)).catch(() => null);
      return t
        ? {
            card: { ...m, media_type: "movie" as const },
            date: cinemaDate(t, country),
            trailer: pickTrailer(t.videos.results)?.key,
          }
        : null;
    }),
  );
  return movies
    .filter((m): m is NonNullable<typeof m> => m !== null && m.date !== null && m.date >= today)
    .toSorted((a, b) => a.date!.localeCompare(b.date!));
}

export type Service = { name: string; logoPath: string };

/** Services in the country that include this title in a subscription (Netflix, Prime Video...), TMDB's order. */
export function subscriptionServices(t: Pick<Title, "watch/providers">, country: string): Service[] {
  return (
    t["watch/providers"].results[country]?.flatrate?.map((p) => ({ name: p.provider_name, logoPath: p.logo_path })) ??
    []
  );
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function discover(type: MediaType, params: Record<string, string>, country: string): Promise<Card[]> {
  const data = await tmdb<{ results: Omit<Card, "media_type">[] }>(`/discover/${type}`, {
    watch_region: country,
    with_watch_monetization_types: "flatrate",
    ...params,
  });
  return data.results.map((r) => ({ ...r, media_type: type }));
}

/** Movies from the last 4 months and series that premiered in the last 6, on a subscription in the country, most popular first. */
export async function getNewOnStreaming(country: string) {
  "use cache";
  cacheLife("hours");
  const [movies, shows] = await Promise.all([
    discover(
      "movie",
      {
        "primary_release_date.gte": daysAgo(120),
        "primary_release_date.lte": daysAgo(0),
        sort_by: "popularity.desc",
        "vote_count.gte": "20",
      },
      country,
    ),
    discover(
      "tv",
      {
        "first_air_date.gte": daysAgo(180),
        "first_air_date.lte": daysAgo(0),
        sort_by: "popularity.desc",
        "vote_count.gte": "10",
      },
      country,
    ),
  ]);
  // alternate movie, show, movie... so neither type takes over the row
  return movies.flatMap((m, i) => (shows[i] ? [m, shows[i]] : [m])).filter((c) => c.poster_path);
}

/** Very well rated titles with few votes, on a subscription in the country. A different page each day. */
export async function getHiddenGems(country: string) {
  "use cache";
  cacheLife("days");
  const page = (Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % 5) + 1;
  const params = {
    "vote_average.gte": "7.6",
    "vote_count.gte": "150",
    "vote_count.lte": "1500",
    sort_by: "vote_average.desc",
    page: String(page),
  };
  const [movies, shows] = await Promise.all([discover("movie", params, country), discover("tv", params, country)]);
  return movies.flatMap((m, i) => (shows[i] ? [m, shows[i]] : [m])).filter((c) => c.poster_path);
}

/** "2026 · Action, Thriller · 1 h 52 min" or "2008 · Drama, Crime · 5 seasons". */
export function titleMeta(t: Title, type: MediaType) {
  const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
  const genres = t.genres
    .slice(0, 2)
    .map((g) => shortGenre(g.name))
    .join(", ");
  const length =
    type === "tv"
      ? t.number_of_seasons
        ? `${t.number_of_seasons} season${t.number_of_seasons === 1 ? "" : "s"}`
        : ""
      : t.runtime
        ? `${Math.floor(t.runtime / 60)} h ${t.runtime % 60} min`
        : "";
  return [year, genres, length].filter(Boolean).join(" · ");
}

/** The official title logo (English first, then language-free), or null. */
export function pickLogo(t: Pick<Title, "images">) {
  const logos = t.images?.logos ?? [];
  const logo = logos.find((l) => l.iso_639_1 === "en") ?? logos.find((l) => l.iso_639_1 === null);
  return logo ? { path: logo.file_path, aspectRatio: logo.aspect_ratio } : null;
}

// TMDB genre names are long in places. Captions under posters are narrow.
const SHORT: Record<string, string> = {
  "Science Fiction": "Sci-Fi",
  "Sci-Fi & Fantasy": "Sci-Fi",
  "Action & Adventure": "Action",
  "War & Politics": "War",
  "TV Movie": "Movie",
};
export const shortGenre = (name: string) => SHORT[name] ?? name;

/** Genre id to name for movies and series together (TMDB uses different ids for some of each). */
export async function getGenreNames(): Promise<Record<number, string>> {
  "use cache";
  cacheLife("days");
  const lists = await Promise.all(
    (["movie", "tv"] as const).map((t) => tmdb<{ genres: { id: number; name: string }[] }>(`/genre/${t}/list`)),
  );
  return Object.fromEntries(lists.flatMap((l) => l.genres.map((g) => [g.id, shortGenre(g.name)])));
}

/**
 * German cinema releases for the next 6 months (theatrical or limited), with the German date and a trailer.
 * Discover filters by German release dates when `region` is set. Feeds the /cinemas calendar.
 */
export async function getCinemaCalendar(country: string) {
  "use cache";
  cacheLife("hours");
  const day = 24 * 60 * 60 * 1000;
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + 182 * day).toISOString().slice(0, 10);
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      tmdb<{ results: Omit<Card, "media_type">[] }>("/discover/movie", {
        region: country,
        with_release_type: "2|3",
        "release_date.gte": today,
        "release_date.lte": until,
        sort_by: "popularity.desc",
        page: String(page),
      }),
    ),
  );
  const unique = [...new Map(pages.flatMap((p) => p.results).map((m) => [m.id, m])).values()];
  const movies = await Promise.all(
    unique.map(async (m) => {
      const t = await getTitle("movie", String(m.id)).catch(() => null);
      return t
        ? {
            card: { ...m, media_type: "movie" as const },
            date: cinemaDate(t, country),
            trailer: pickTrailer(t.videos.results)?.key,
          }
        : null;
    }),
  );
  return movies
    .filter((m): m is NonNullable<typeof m> => m !== null && m.date !== null && m.date >= today && m.date <= until)
    .toSorted((a, b) => a.date!.localeCompare(b.date!));
}
