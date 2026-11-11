import { describe, expect, it } from "vitest";
import { friendsSentence, groupByTitle } from "./activity";

describe("friendsSentence", () => {
  it("names one or two, counts the rest", () => {
    expect(friendsSentence(["anna_k"])).toBe("anna_k");
    expect(friendsSentence(["anna_k", "ben"])).toBe("anna_k and ben");
    expect(friendsSentence(["anna_k", "ben", "mia"])).toBe("anna_k and 2 friends");
  });
});

describe("groupByTitle", () => {
  const at = (h: number) => new Date(Date.UTC(2026, 10, 11, h));
  it("one entry per title, newest first, each friend once", () => {
    const grouped = groupByTitle([
      { mediaType: "tv", tmdbId: 1, name: "ben", at: at(8) },
      { mediaType: "tv", tmdbId: 1, name: "anna_k", at: at(10) },
      { mediaType: "tv", tmdbId: 1, name: "anna_k", at: at(9) },
      { mediaType: "movie", tmdbId: 2, name: "mia", at: at(11) },
    ]);
    expect(grouped.map((g) => [g.tmdbId, g.names])).toEqual([
      [2, ["mia"]],
      [1, ["anna_k", "ben"]],
    ]);
  });
});
