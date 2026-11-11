import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));
const { toCsv } = await import("./export");

describe("toCsv", () => {
  it("writes a header and one line per row, quoting where needed", () => {
    const csv = toCsv([
      {
        list: "history",
        type: "tv",
        tmdbId: 1396,
        title: 'Breaking "Bad", Pilot',
        season: 1,
        episode: 1,
        date: new Date("2026-11-01T20:00:00Z"),
      },
      {
        list: "watchlist",
        type: "movie",
        tmdbId: 7,
        title: "=HYPERLINK()",
        season: null,
        episode: null,
        date: new Date(0),
      },
    ]);
    expect(csv.split("\n")).toEqual([
      "list,type,tmdb_id,title,season,episode,date",
      'history,tv,1396,"Breaking ""Bad"", Pilot",1,1,2026-11-01T20:00:00.000Z',
      "watchlist,movie,7,'=HYPERLINK(),,,1970-01-01T00:00:00.000Z",
      "",
    ]);
  });
});
