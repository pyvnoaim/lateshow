import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/tmdb";
import { filterCards, GENRES, MAX_MORE, readSearch, searchHref } from "./filters";

const card = (id: number, media_type: "movie" | "tv", genre_ids: number[]): Card => ({
  id,
  media_type,
  poster_path: null,
  genre_ids,
});
const scifi = GENRES.find((g) => g.slug === "sci-fi")!;
const horror = GENRES.find((g) => g.slug === "horror")!;

describe("readSearch / searchHref", () => {
  it("reads the URL and writes it back", () => {
    const s = readSearch({ q: " dune ", type: "series", genre: "sci-fi" });
    expect(s).toEqual({ q: "dune", type: "tv", genre: scifi, more: 1 });
    expect(searchHref(s, {})).toBe("/search?q=dune&type=series&genre=sci-fi");
    expect(searchHref(s, { type: "all", genre: null })).toBe("/search?q=dune");
  });
  it("ignores unknown values", () => {
    expect(readSearch({ type: "x", genre: "nope" })).toEqual({ q: "", type: "all", genre: null, more: 1 });
  });
});

describe("filterCards", () => {
  const cards = [card(1, "movie", [878]), card(2, "tv", [10765]), card(3, "movie", [18]), card(4, "tv", [18])];
  it("matches a genre by the movie or the series id", () => {
    expect(filterCards(cards, "all", scifi).map((c) => c.id)).toEqual([1, 2]);
    expect(filterCards(cards, "tv", scifi).map((c) => c.id)).toEqual([2]);
  });
  it("finds no series for a movie-only genre", () => {
    expect(filterCards([card(5, "tv", [27])], "all", horror)).toEqual([]);
  });

  it("Show more: counts steps in the URL, capped, and a new filter starts over", () => {
    const s = readSearch({ genre: "horror", more: "3" });
    expect(s.more).toBe(3);
    expect(readSearch({ more: "999" }).more).toBe(MAX_MORE);
    expect(readSearch({ more: "-2" }).more).toBe(1);
    expect(searchHref(s, { more: 4 })).toBe("/search?genre=horror&more=4");
    expect(searchHref(s, { type: "movie" })).toBe("/search?type=movie&genre=horror");
  });
});
