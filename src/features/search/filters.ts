import type { Card, MediaType } from "@/lib/tmdb";

/**
 * Genres people browse by, with TMDB's movie and series ids (series lump some together, like Sci-Fi & Fantasy).
 * null: TMDB has no such series genre, so the genre only finds movies. A to Z, as shown.
 */
export const GENRES = [
  { slug: "action", label: "Action", movie: 28, tv: 10759 },
  { slug: "animation", label: "Animation", movie: 16, tv: 16 },
  { slug: "comedy", label: "Comedy", movie: 35, tv: 35 },
  { slug: "crime", label: "Crime", movie: 80, tv: 80 },
  { slug: "documentary", label: "Documentary", movie: 99, tv: 99 },
  { slug: "drama", label: "Drama", movie: 18, tv: 18 },
  { slug: "family", label: "Family", movie: 10751, tv: 10751 },
  { slug: "fantasy", label: "Fantasy", movie: 14, tv: 10765 },
  { slug: "horror", label: "Horror", movie: 27, tv: null },
  { slug: "mystery", label: "Mystery", movie: 9648, tv: 9648 },
  { slug: "romance", label: "Romance", movie: 10749, tv: null },
  { slug: "sci-fi", label: "Sci-Fi", movie: 878, tv: 10765 },
  { slug: "thriller", label: "Thriller", movie: 53, tv: null },
  { slug: "war", label: "War", movie: 10752, tv: 10768 },
  { slug: "western", label: "Western", movie: 37, tv: 37 },
] as const;

export type Genre = (typeof GENRES)[number];
export type TypeFilter = MediaType | "all";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type SearchParams = {
  q?: string | string[];
  type?: string | string[];
  genre?: string | string[];
  more?: string | string[];
};

/** The search page's state from its URL: ?q=dune&type=movie&genre=sci-fi. Unknown values fall back to "any". */
export function readSearch(s: SearchParams) {
  const type = one(s.type);
  return {
    q: (one(s.q) ?? "").trim().slice(0, 100),
    type: (type === "movie" ? "movie" : type === "series" ? "tv" : "all") as TypeFilter,
    genre: GENRES.find((g) => g.slug === one(s.genre)) ?? null,
    // how many "Show more" steps (24 titles each) browsing shows, capped so a URL can't ask TMDB for 50 pages
    more: Math.min(Math.max(Number.parseInt(one(s.more) ?? "1", 10) || 1, 1), MAX_MORE),
  };
}

export const PER_STEP = 24;
export const MAX_MORE = 8;

export type SearchState = ReturnType<typeof readSearch>;

/** A search link with some filters changed. `null` removes one. */
export function searchHref(state: SearchState, patch: { type?: TypeFilter; genre?: Genre | null; more?: number }) {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.type !== "all") params.set("type", next.type === "tv" ? "series" : "movie");
  if (next.genre) params.set("genre", next.genre.slug);
  // a new filter starts back at 24, only "Show more" carries the count on
  if (patch.more && patch.more > 1) params.set("more", String(patch.more));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

/** Search results narrowed to a type and a genre (search hits carry their genre ids). Pure. */
export function filterCards(cards: Card[], type: TypeFilter, genre: Genre | null) {
  return cards.filter((c) => {
    if (type !== "all" && c.media_type !== type) return false;
    if (!genre) return true;
    const id = genre[c.media_type];
    return id !== null && (c.genre_ids ?? []).includes(id);
  });
}
