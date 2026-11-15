import { describe, expect, it } from "vitest";
import { nextEpisode, parseEpisodeKeys, showProgress } from "./progress";

const show = [
  { number: 0, episodes: [1, 2, 3] },
  { number: 2, episodes: [1, 2, 3] },
  { number: 1, episodes: [1, 2] },
];
// Hunter x Hunter on TMDB: seasons count on, season 3 is episodes 137 to 148
const absolute = [
  { number: 1, episodes: [1, 2] },
  { number: 2, episodes: [3, 4] },
  { number: 3, episodes: [5, 6] },
];

describe("nextEpisode", () => {
  it("starts at S1 E1 when nothing is watched, ignoring specials", () => {
    expect(nextEpisode(show, [])).toEqual({ season: 1, episode: 1 });
  });

  it("continues across a season break", () => {
    expect(nextEpisode(show, [{ season: 1, episode: 2 }])).toEqual({ season: 2, episode: 1 });
  });

  it("doesn't pull you back to an episode you skipped", () => {
    expect(
      nextEpisode(show, [
        { season: 1, episode: 1 },
        { season: 2, episode: 2 },
      ]),
    ).toEqual({ season: 2, episode: 3 });
  });

  it("follows a show that numbers its episodes on across seasons", () => {
    expect(nextEpisode(absolute, [{ season: 2, episode: 4 }])).toEqual({ season: 3, episode: 5 });
    const all = absolute.flatMap((s) => s.episodes.map((episode) => ({ season: s.number, episode })));
    expect(nextEpisode(absolute, all)).toBeNull();
    expect(showProgress(absolute, all).percent).toBe(100);
  });

  it("is null when you're caught up", () => {
    expect(nextEpisode(show, [{ season: 2, episode: 3 }])).toBeNull();
  });
});

describe("showProgress", () => {
  it("counts regular episodes only", () => {
    const watched = [
      { season: 0, episode: 1 },
      { season: 1, episode: 1 },
      { season: 2, episode: 1 },
    ];
    expect(showProgress(show, watched)).toEqual({ done: 2, total: 5, percent: 40 });
  });

  it("is 0 percent for a show without episodes", () => {
    expect(showProgress([], [])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("parseEpisodeKeys", () => {
  it("turns library keys into refs", () => {
    expect(parseEpisodeKeys(["2-4", "0-0"])).toEqual([
      { season: 2, episode: 4 },
      { season: 0, episode: 0 },
    ]);
  });
});
