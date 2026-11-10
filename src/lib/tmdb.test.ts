import { describe, expect, it } from "vitest";
import { toCards, type Card } from "./tmdb";

const movie = (id: number): Card => ({ id, media_type: "movie", title: `M${id}`, poster_path: null });

describe("toCards", () => {
  it("flattens people into their known titles and drops duplicates", () => {
    const cards = toCards([movie(1), { media_type: "person", known_for: [movie(1), movie(2)] }, movie(2)]);
    expect(cards.map((c) => c.id)).toEqual([1, 2]);
  });

  it("keeps a movie and a series that share an id", () => {
    const cards = toCards([movie(5), { ...movie(5), media_type: "tv" }]);
    expect(cards).toHaveLength(2);
  });

  it("copes with a person without known titles", () => {
    expect(toCards([{ media_type: "person" }])).toEqual([]);
  });
});
