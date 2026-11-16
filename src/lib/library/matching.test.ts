import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("@/lib/tmdb", () => ({
  findByImdbId: vi.fn(),
  getAiredEpisodes: vi.fn(async () => []),
  img: () => null,
  searchForImport: vi.fn(async () => [
    { id: 62_999, type: "tv", title: "Trinity Seven", date: "2014-10-08", posterPath: null },
  ]),
}));
const { match } = await import("./matching");

const film = { id: 475_000, type: "movie" as const, title: "Trinity Seven: Eternity Library", posterPath: null };
const links = new Map([["crunchyroll:G1", film]]);

describe("match with remembered links", () => {
  it("a series row ignores a remembered film and matches the series", async () => {
    const m = await match({ title: "TRINITY SEVEN", type: "tv", list: "watchlist", refs: ["crunchyroll:G1"] }, links);
    expect(m).toMatchObject({ id: 62_999, type: "tv" });
  });

  it("a film row still takes it", async () => {
    const m = await match({ title: "x", type: "movie", list: "watched", refs: ["crunchyroll:G1"] }, links);
    expect(m).toMatchObject({ id: 475_000, type: "movie" });
  });
});
