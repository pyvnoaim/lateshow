import { describe, expect, it } from "vitest";
import { dayTitles, episodesLabel, historyEntries, watchTime } from "./history";

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
const label = (d: Date | null) => (d?.getDate() === 2 ? "Today" : "Yesterday");

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

  it("keeps a rewatch apart from first watches of the same show", () => {
    const again = { ...ep(1, 1, 3), rewatch: true };
    expect(historyEntries([{ ...ep(1, 1, 4), rewatch: true }, again, ep(1, 2, 1)], label)[0][1]).toHaveLength(2);
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

describe("dayTitles", () => {
  it("puts all of a title's rows together, the most watched first, unknown runtime as 1 minute", () => {
    const rows = [
      { ...ep(1, 1, 3), minutes: 25 },
      { ...movie(9), minutes: 120 },
      { ...ep(1, 1, 2), minutes: 25 },
      { ...ep(2, 1, 1), minutes: 0 },
      { ...ep(1, 1, 1), minutes: 25 },
    ];
    const titles = dayTitles(rows);
    expect(titles.map((t) => [t.row.tmdbId, t.episodes.length, t.minutes])).toEqual([
      [9, 1, 120],
      [1, 3, 75],
      [2, 1, 1],
    ]);
    expect(titles[0].row).toBe(rows[1]);
  });

  it("formats watch time", () => {
    expect([watchTime(40), watchTime(60), watchTime(210)]).toEqual(["40 min", "1 h", "3.5 h"]);
  });
});
