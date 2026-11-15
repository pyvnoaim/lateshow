import { describe, expect, it } from "vitest";
import { episodesLabel, historyEntries } from "./history";

let id = 0;
const ep = (tmdbId: number, season: number, episode: number, day = "a") => ({
  id: id++,
  mediaType: "tv" as const,
  tmdbId,
  season,
  episode,
  watchedAt: new Date(2026, 9, day === "a" ? 2 : 1),
});
const movie = (tmdbId: number) => ({ ...ep(tmdbId, 0, 0), mediaType: "movie" as const });
const label = (d: Date) => (d.getDate() === 2 ? "Today" : "Yesterday");

describe("historyEntries", () => {
  it("merges back to back episodes of one show within a day", () => {
    const rows = [ep(1, 6, 15), ep(1, 6, 14), movie(9), ep(1, 6, 13), ep(1, 6, 12, "b"), ep(2, 1, 1, "b")];
    const groups = historyEntries(rows, label);
    expect(groups.map(([d, e]) => [d, e.map((x) => x.episodes.length)])).toEqual([
      ["Today", [2, 1, 1]],
      ["Yesterday", [1, 1]],
    ]);
  });

  it("keeps episodes of different days apart under one heading", () => {
    const month = () => "October";
    expect(historyEntries([ep(1, 1, 2, "a"), ep(1, 1, 1, "b")], month)[0][1]).toHaveLength(2);
  });

  it("never merges movies", () => {
    expect(historyEntries([movie(9), movie(9)], label)[0][1]).toHaveLength(2);
  });
});

describe("episodesLabel", () => {
  it("reads naturally", () => {
    expect(episodesLabel([ep(1, 1, 2)])).toBe("Season 1, episode 2");
    expect(episodesLabel([ep(1, 6, 15), ep(1, 6, 13), ep(1, 6, 14)])).toBe("Season 6, episodes 13 to 15");
    expect(episodesLabel([ep(1, 6, 15), ep(1, 6, 13)])).toBe("Season 6, 2 episodes");
    expect(episodesLabel([ep(1, 6, 1), ep(1, 5, 12)])).toBe("Season 5 to 6, 2 episodes");
    expect(episodesLabel([movie(1)])).toBe("Movie");
  });
});
