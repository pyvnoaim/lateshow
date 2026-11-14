import { describe, expect, it } from "vitest";
import { norm, parseCsv, pickMatch, placeEpisodes, readExport } from "./importing";

describe("parseCsv", () => {
  it("handles quotes, commas, escaped quotes, CRLF and a BOM", () => {
    const text = '﻿Name,Year\r\n"Crouching Tiger, Hidden Dragon",2000\r\n"The ""Thing""",1982\r\n';
    expect(parseCsv(text)).toEqual([
      ["Name", "Year"],
      ["Crouching Tiger, Hidden Dragon", "2000"],
      ['The "Thing"', "1982"],
    ]);
  });
});

describe("readExport", () => {
  it("reads Letterboxd: diary dates win over watched, watchlist separate, ratings bring scores", () => {
    const { rows } = readExport([
      { name: "watched.csv", text: "Date,Name,Year,Letterboxd URI\n2020-01-01,Dune,2021,x\n2020-02-02,Heat,1995,x" },
      {
        name: "export/diary.csv",
        text: "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2021-11-01,Dune,2021,x,4,,,2021-10-28",
      },
      { name: "watchlist.csv", text: "Date,Name,Year,Letterboxd URI\n2022-05-05,Alien,1979,x" },
      {
        name: "ratings.csv",
        text: "Date,Name,Year,Letterboxd URI,Rating\n2020-01-01,Dune,2021,x,4\n2020-01-01,Heat,1995,x,4.5\n2019-01-01,Cats,2019,x,1",
      },
    ]);
    expect(rows).toEqual([
      { title: "Dune", year: 2021, type: "movie", list: "watched", date: "2021-10-28", score: 8 },
      { title: "Heat", year: 1995, type: "movie", list: "watched", date: "2020-02-02", score: 9 },
      { title: "Cats", year: 2019, type: "movie", list: "watched", date: "2019-01-01", score: 2 },
      { title: "Alien", year: 1979, type: "movie", list: "watchlist", date: "2022-05-05" },
    ]);
  });

  it("reads IMDb ratings as watched films and skips episodes and rated series", () => {
    const { rows, skipped } = readExport([
      {
        name: "ratings.csv",
        text: "Const,Your Rating,Date Rated,Title,URL,Title Type,Year\ntt0133093,9,2019-03-01,The Matrix,u,Movie,1999\ntt0903747,10,2019-04-01,Breaking Bad,u,TV Series,2008\ntt0959621,9,2019-04-02,Pilot,u,TV Episode,2008",
      },
    ]);
    expect(rows).toEqual([
      {
        title: "The Matrix",
        year: 1999,
        imdbId: "tt0133093",
        type: "movie",
        list: "watched",
        date: "2019-03-01",
        score: 9,
      },
    ]);
    expect(skipped).toBe(2);
  });

  it("reads an IMDb watchlist with series", () => {
    const { rows } = readExport([
      {
        name: "WATCHLIST.csv",
        text: "Position,Const,Created,Title,Title Type,Year\n1,tt0903747,2023-01-02,Breaking Bad,TV Series,2008",
      },
    ]);
    expect(rows[0]).toMatchObject({ imdbId: "tt0903747", type: "tv", list: "watchlist" });
  });
});

describe("pickMatch", () => {
  const hits = [
    { id: 1, title: "Suspiria", year: 2018 },
    { id: 2, title: "Suspiria", year: 1977 },
    { id: 3, title: "Suspiria in Concert", year: 2019 },
  ];
  it("takes the one with the same title and year", () => {
    expect(pickMatch({ title: "Suspiria", year: 1977 }, hits)).toEqual({ match: hits[1] });
  });
  it("accepts a year that is one off", () => {
    expect(pickMatch({ title: "suspiria", year: 1976 }, hits)).toEqual({ match: hits[1] });
  });
  it("asks when the title fits several and no year decides", () => {
    expect(pickMatch({ title: "Suspiria" }, hits)).toEqual({ candidates: hits.slice(0, 2) });
  });
  it("asks when nothing has the same title", () => {
    expect(pickMatch({ title: "Suspira", year: 2018 }, hits)).toHaveProperty("candidates");
  });
  it("compares without accents and punctuation", () => {
    expect(norm("Amélie & Co.")).toBe(norm("amelie and co"));
  });
});

describe("Netflix", () => {
  const csv = [
    "Title,Date",
    '"Dark: Season 2: Lost and Found","3/2/24"',
    '"Dark: Season 1: Secrets","3/1/24"',
    '"Dark: Season 1: Secrets","2/1/24"',
    '"Stranger Things: Stranger Things 4: Chapter One: The Hellfire Club","1/5/23"',
    '"Brooklyn Nine-Nine: Season 4: Coral Palms: Part 1","1/4/23"',
    '"Hotel Transylvania 3: Summer Vacation","10/7/22"',
    '"Legion","10/6/22"',
    '"The Office (U.S.): Season 2: The Dundies","10/6/22"',
    '" : Episode 12","10/6/22"',
    '" : Episode 13","10/6/22"',
    '" : Episode 14","10/6/22"',
  ].join("\n");

  it("groups episodes per series, keeps the first watch, tells films apart, skips nameless series", () => {
    const { rows, skipped } = readExport([{ name: "NetflixViewingHistory.csv", text: csv }]);
    expect(skipped).toBe(3);
    const dark = rows.find((r) => r.title === "Dark")!;
    expect(dark).toMatchObject({ type: "tv", list: "watched", date: "2024-03-02" });
    expect(dark.episodes).toEqual([
      { season: 1, name: "Secrets", date: "2024-02-01" },
      { season: 2, name: "Lost and Found", date: "2024-03-02" },
    ]);
    expect(rows.find((r) => r.title === "Stranger Things")!.episodes).toEqual([
      { season: 4, name: "Chapter One: The Hellfire Club", date: "2023-01-05" },
    ]);
    expect(rows.find((r) => r.title === "Brooklyn Nine-Nine")!.episodes![0].name).toBe("Coral Palms: Part 1");
    expect(rows.find((r) => r.title === "The Office")!.episodes).toHaveLength(1);
    expect(rows.filter((r) => r.type === "movie").map((r) => r.title)).toEqual([
      "Legion",
      "Hotel Transylvania 3: Summer Vacation",
    ]);
  });

  it("reads day-first dates when a day is over 12", () => {
    const { rows } = readExport([{ name: "n.csv", text: 'Title,Date\n"Legion","25/12/2023"\n"Heat","01/02/2023"' }]);
    expect(rows.map((r) => r.date)).toEqual(["2023-02-01", "2023-12-25"]);
  });

  it("places episodes by name, in the named season first, then any season, then Episode N", () => {
    const aired = [
      { season: 1, episode: 1, name: "Pilot", minutes: 40 },
      { season: 1, episode: 2, name: "Secrets", minutes: 40 },
      { season: 2, episode: 1, name: "Pilot", minutes: 40 },
      { season: 2, episode: 5, name: "Something Else", minutes: 40 },
    ];
    const { placed, missed } = placeEpisodes(
      [
        { season: 2, name: "Pilot" },
        { season: 3, name: "Secrets", date: "2024-01-01" },
        { season: 2, name: "Episode 5" },
        { name: "Nope" },
        { name: "Some Arc: Something Else" },
        { season: 1, name: "Secrets (No. 145)" },
      ],
      aired,
    );
    expect(placed.map((p) => [p.season, p.episode])).toEqual([
      [2, 1],
      [1, 2],
      [2, 5],
      [2, 5],
      [1, 2],
    ]);
    expect(placed[1].date).toBe("2024-01-01");
    expect(missed).toBe(1);
  });
});
