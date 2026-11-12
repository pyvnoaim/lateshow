import { describe, expect, it } from "vitest";
import { norm, parseCsv, pickMatch, readExport } from "./importing";

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
