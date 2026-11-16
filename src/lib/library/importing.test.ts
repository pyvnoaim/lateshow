import { describe, expect, it } from "vitest";
import {
  norm,
  parseCsv,
  pickMatch,
  placeEpisodes,
  primeSince,
  primeTitle,
  readCrunchyrollHistory,
  readCrunchyrollWatchlist,
  readExport,
  readNetflixHistory,
  readNetflixWatchlist,
  readPrimeHistory,
  readPrimeWatchlist,
  watchMonths,
} from "./importing";

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

describe("watchMonths", () => {
  it("counts films once and episodes by their own day, fills empty months, skips the watchlist", () => {
    expect(
      watchMonths([
        { title: "Heat", type: "movie", list: "watched", date: "2023-11-04" },
        { title: "Alien", type: "movie", list: "watchlist", date: "2023-12-01" },
        {
          title: "Dark",
          type: "tv",
          list: "watched",
          date: "2024-02-02",
          episodes: [
            { season: 1, name: "Secrets", date: "2024-02-01" },
            { season: 1, name: "Lies", date: "2024-02-02" },
          ],
        },
      ]),
    ).toEqual([
      { month: "2023-11", count: 1 },
      { month: "2023-12", count: 0 },
      { month: "2024-01", count: 0 },
      { month: "2024-02", count: 2 },
    ]);
    expect(watchMonths([{ title: "Alien", type: "movie", list: "watchlist" }])).toEqual([]);
  });
});

describe("Prime Video", () => {
  const head =
    '"Date Watched","Type","Title","Episode Title","Global Title Identifier","Episode Global Title Identifier","Path","Episode Path","Image URL"';
  const row = (date: string, type: string, title: string, ep = "") =>
    [date, type, title, ep, "gti", "", "/detail/x", "", "img"].map((v) => `"${v.replaceAll('"', '""')}"`).join(",");
  const file = [
    head,
    row("2026-06-15 00:35:23.963", "Series", "The Boys - Season 1", 'Episode 5: "Good for the Soul"'),
    row("2026-06-14 21:10:00.000", "Series", "Lost - Staffel 1 [dt./OV]", "Folge 2: Gestrandet, Teil 2"),
    row("2026-06-14 20:00:00.000", "Series", "Hawaii Five-0, Season 8", "Episode 3: Ka laina ma ke one"),
    row("2026-06-13 20:00:00.000", "Series", "South Park", "Episode 4: Wackelpudding"),
    row("2026-06-12 21:00:00.000", "Series", "Lucifer: Staffel 6", "Folge 1: Bye Bye Lucifer"),
    row("2026-06-12 20:30:00.000", "Series", "Breadwinners Season 2", "Episode 7: Duck Tales"),
    row("2026-06-12 20:10:00.000", "Series", "Season 1", "Episode 1: Pilot"),
    row("2026-06-12 20:00:00.000", "Movie", "Scream 4"),
    row("2026-06-11 20:00:00.000", "Series", "The Boys - Season 1", 'Episode 4: "The Female of the Species"'),
    row("2022-12-05 19:32:36.976", "Movie", "Scream 4"),
  ].join("\n");

  it("reads seasons, episode numbers and names from Prime's titles, first watch per film", () => {
    const { rows, skipped } = readExport([{ name: "watch-history-export-1.csv", text: file }]);
    expect(skipped).toBe(1);
    const show = (t: string) => rows.find((r) => r.title === t);
    expect(show("The Boys")?.episodes).toEqual([
      { season: 1, episode: 4, name: "The Female of the Species", date: "2026-06-11" },
      { season: 1, episode: 5, name: "Good for the Soul", date: "2026-06-15" },
    ]);
    expect(show("The Boys")?.date).toBe("2026-06-15");
    expect(show("Lost")?.episodes).toEqual([{ season: 1, episode: 2, name: "Gestrandet, Teil 2", date: "2026-06-14" }]);
    expect(show("Hawaii Five-0")?.episodes?.[0]).toMatchObject({ season: 8, episode: 3 });
    expect(show("Lucifer")?.episodes?.[0]).toMatchObject({ season: 6, episode: 1 });
    expect(show("Breadwinners")?.episodes?.[0]).toMatchObject({ season: 2, episode: 7 });
    expect(show("South Park")?.episodes?.[0]).toMatchObject({ season: undefined, episode: 4, name: "Wackelpudding" });
    expect(rows.filter((r) => r.type === "movie")).toEqual([
      { title: "Scream 4", type: "movie", list: "watched", date: "2022-12-05", refs: ["prime:gti"] },
    ]);
  });

  it("places by number when the name is translated", () => {
    const aired = [
      { season: 1, episode: 1, name: "Pilot (1)" },
      { season: 1, episode: 2, name: "Pilot (2)" },
    ];
    const { placed, missed } = placeEpisodes(
      [{ season: 1, episode: 2, name: "Gestrandet, Teil 2", date: "2026-06-14" }],
      aired,
    );
    expect(placed).toEqual([{ season: 1, episode: 2, name: "Pilot (2)", date: "2026-06-14" }]);
    expect(missed).toBe(0);
  });
});

describe("Prime Video history data (the extension)", () => {
  // shaped like the page's watch-history widget (made up ids, no tokens)
  const days = [
    {
      date: "November 15, 2026",
      titles: [
        {
          titleType: "season",
          time: Date.parse("2026-11-15T20:00:00Z"),
          gti: "amzn1.dv.gti.season",
          title: { text: "Highschool of the Dead [dt./OV]" },
          children: [
            {
              titleType: "episode",
              time: Date.parse("2026-11-15T20:00:00Z"),
              gti: "amzn1.dv.gti.e2",
              title: { text: "Episode 2: Shadow of the DEAD" },
            },
            {
              titleType: "episode",
              time: Date.parse("2026-11-15T19:30:00Z"),
              gti: "amzn1.dv.gti.e1",
              title: { text: "Episode 1: Spring of the DEAD" },
            },
          ],
        },
      ],
    },
    {
      date: "July 4, 2026",
      titles: [
        {
          titleType: "movie",
          time: Date.parse("2026-07-04T21:00:00Z"),
          gti: "amzn1.dv.gti.m",
          title: { text: "Zodiac" },
          children: [],
        },
        {
          titleType: "season",
          time: Date.parse("2026-07-04T18:00:00Z"),
          title: { text: "South Park Season 26" },
          children: [
            {
              titleType: "episode",
              time: Date.parse("2026-07-04T18:00:00Z"),
              title: { text: "Episode 3: Japanese Toilet" },
            },
          ],
        },
      ],
    },
  ];

  it("reads seasons as shows with their episodes, movies as films, with the day", () => {
    const { rows, skipped } = readPrimeHistory(days);
    expect(skipped).toBe(0);
    expect(rows.find((r) => r.title === "Highschool of the Dead")?.episodes).toEqual([
      { season: undefined, episode: 1, name: "Spring of the DEAD", date: "2026-11-15" },
      { season: undefined, episode: 2, name: "Shadow of the DEAD", date: "2026-11-15" },
    ]);
    expect(rows.find((r) => r.title === "South Park")?.episodes).toEqual([
      { season: 26, episode: 3, name: "Japanese Toilet", date: "2026-07-04" },
    ]);
    expect(rows.find((r) => r.type === "movie")).toEqual({
      title: "Zodiac",
      type: "movie",
      list: "watched",
      date: "2026-07-04",
      refs: ["prime:amzn1.dv.gti.m"],
    });
    // a show carries its seasons' ids, so a confirmed match is remembered for every season
    expect(rows.find((r) => r.title === "Highschool of the Dead")?.refs).toEqual(["prime:amzn1.dv.gti.season"]);
  });

  it("keeps only what came after the last import (Read new)", () => {
    const since = Date.parse("2026-11-15T19:45:00Z");
    const newer = primeSince(days, since);
    expect(newer).toHaveLength(1);
    expect(newer[0].titles.map((t) => t.children?.map((e) => e.title?.text))).toEqual([
      ["Episode 2: Shadow of the DEAD"],
    ]);
    expect(primeSince(days, Date.parse("2026-11-16T00:00:00Z"))).toEqual([]);
  });
});

describe("primeTitle", () => {
  it("drops Prime's tags, keeps a year, puts a moved article back", () => {
    expect(primeTitle("Central Intelligence (Theatrical Version)")).toEqual({ title: "Central Intelligence" });
    expect(primeTitle("Truth Or Dare (Unrated Director’s Cut)")).toEqual({ title: "Truth Or Dare" });
    expect(primeTitle("Lights Out (2016)")).toEqual({ title: "Lights Out", year: 2016 });
    expect(primeTitle("WHEEL OF TIME, THE (2021)")).toEqual({ title: "THE WHEEL OF TIME", year: 2021 });
    expect(primeTitle("FROM (TV)")).toEqual({ title: "FROM" });
    expect(primeTitle("Lost - Staffel 1 [dt./OV]")).toEqual({ title: "Lost - Staffel 1" });
    const head = '"Date Watched","Type","Title","Episode Title","Global Title Identifier"';
    const { rows } = readExport([
      {
        name: "p.csv",
        text: [
          head,
          '"2026-01-01 20:00:00.000","Series","WHEEL OF TIME, THE (2021) - Season 2","Episode 1: Strike","g"',
        ].join("\n"),
      },
    ]);
    expect(rows[0]).toMatchObject({ title: "THE WHEEL OF TIME", year: 2021, type: "tv" });
    expect(rows[0].episodes?.[0]).toMatchObject({ season: 2, episode: 1 });
  });

  it("skips trailers Prime counts as watched", () => {
    const head = '"Date Watched","Type","Title","Episode Title","Global Title Identifier"';
    const { rows, skipped } = readExport([
      {
        name: "p.csv",
        text: [head, '"2026-01-01 20:00:00.000","Movie","Episode 0: Trailer Staffel 4","",""'].join("\n"),
      },
    ]);
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });
});

describe("watchMonths with undated episodes", () => {
  it("leaves out episodes that have no day", () => {
    const months = watchMonths([
      {
        title: "Gachiakuta",
        type: "tv",
        list: "watched",
        date: "2025-10-08",
        episodes: [
          { season: 1, episode: 1, name: "a", undated: true },
          { season: 1, episode: 6, name: "b", date: "2025-10-08" },
        ],
      },
    ]);
    expect(months).toEqual([{ month: "2025-10", count: 1 }]);
  });
});

describe("Crunchyroll history (the extension)", () => {
  // shaped like content/v2/<account>/watch-history, trimmed from a real answer (ids kept short)
  const ep = (id: string, n: number, title: string, played: string, extra: Record<string, unknown> = {}) => ({
    id,
    date_played: played,
    fully_watched: true,
    panel: {
      type: "episode",
      title,
      episode_metadata: {
        series_id: "GP5HJ84P7",
        series_title: "Gachiakuta",
        season_number: 1,
        episode_number: n,
        sequence_number: n,
        episode_air_date: `2025-07-${String(5 + n).padStart(2, "0")}T00:00:00Z`,
        identifier: `GP5HJ84P7|S00352501|E${n}`,
        ...extra,
      },
    },
  });
  const bulk = "2025-10-06T21:34:07Z";

  it("keeps every dub of an episode once, only finished ones, and dates a season marked at once as unknown", () => {
    const { rows, skipped } = readCrunchyrollHistory([
      ...[1, 2, 3, 4, 5].map((n) => ep(`G${n}de`, n, `Episode ${n}`, bulk)),
      ep("G3en", 3, "The Ground", bulk), // the English dub of episode 3
      ep("G6", 6, "One Good Strike!!", "2025-10-08T20:00:00Z"),
      { ...ep("G7", 7, "A Score to Settle", "2025-10-09T20:00:00Z"), fully_watched: false },
      { id: "GX", date_played: bulk, fully_watched: true }, // no details
      { id: "M1", date_played: "2025-09-01T19:00:00Z", fully_watched: true, panel: { type: "movie", title: "Suzume" } },
    ]);
    expect(skipped).toBe(1);
    const show = rows.find((r) => r.type === "tv")!;
    expect(show).toMatchObject({ title: "Gachiakuta", refs: ["crunchyroll:GP5HJ84P7"], date: "2025-10-08" });
    expect(show.episodes?.map((e) => [e.episode, e.undated ?? e.date])).toEqual([
      [1, true],
      [2, true],
      [3, true],
      [4, true],
      [5, true],
      [6, "2025-10-08"],
    ]);
    expect(show.episodes?.[5]).toMatchObject({ season: 1, airDate: "2025-07-11", absolute: 6 });
    expect(rows.find((r) => r.type === "movie")).toMatchObject({ title: "Suzume", date: "2025-09-01" });
  });

  it("places by air date first, a day off still counts when it's the only one, then by absolute number", () => {
    const aired = [
      { season: 1, episode: 1, name: "The Sphere", airDate: "2025-07-06" },
      { season: 1, episode: 2, name: "The Inhabited", airDate: "2025-07-13" },
      { season: 2, episode: 1, name: "Penta", airDate: "2026-01-11" },
      { season: 2, episode: 2, name: "Amo", airDate: "2026-01-25" },
      { season: 2, episode: 3, name: "Riyo", airDate: "2026-01-25" }, // a double episode, one day
    ];
    const { placed, missed } = placeEpisodes(
      [
        // Crunchyroll calls it season 1 episode 14, TMDB season 2 episode 1: the date decides
        { season: 1, episode: 14, name: "Penta: The Desert", airDate: "2026-01-11" },
        { season: 1, episode: 2, name: "Bewohnt", airDate: "2025-07-12" }, // a day off, still the only one
        { season: 1, episode: 16, name: "Riyo", airDate: "2026-01-25" }, // two that day: the name picks
        { season: 1, episode: 99, name: "x", airDate: "2030-01-01", absolute: 1 }, // only the absolute number fits
        { season: 1, episode: 98, name: "y", airDate: "2030-02-01" },
      ],
      aired,
    );
    expect(placed.map((p) => `${p.season}x${p.episode}`)).toEqual(["2x1", "1x2", "2x3", "1x1"]);
    expect(missed).toBe(1);
  });
});

describe("readNetflixHistory", () => {
  // newest first, as Netflix sends it (the shape of a real answer, 2026-11-15)
  const at = (d: string) => new Date(`${d}T21:00:00`).getTime();
  const ep = (id: number, name: string, season: string, d: string) => ({
    movieID: id,
    date: at(d),
    title: `${season}: "${name}"`,
    episodeTitle: name,
    seasonDescriptor: season,
    series: 70300800,
    seriesTitle: "BoJack Horseman",
  });

  it("makes a show of its episodes (first watch each, by season and name) and a film of the rest", () => {
    const { rows, skipped } = readNetflixHistory([
      ep(80200253, "The Stopped Show", "Season 5", "2026-11-11"),
      { movieID: 81000001, date: at("2026-11-10"), title: "Glass Onion" },
      ep(80200252, "The Showstopper", "Season 5", "2026-11-09"),
      ep(80200253, "The Stopped Show", "Season 5", "2026-11-08"), // watched twice: the first time counts
      ep(80000001, "Nothing to Remember", "Part 2", "2026-11-01"),
      { date: at("2026-10-01") }, // nothing to place
      { movieID: 81000002, date: at("2026-10-02"), title: "  " }, // a name of only spaces
      { ...ep(80000002, "Pilot", "Season 1", "2026-10-03"), seriesTitle: " " },
      ep(80000003, "Year in Review", "Season 2024", "2026-10-04"), // a year, not a season
    ]);
    expect(skipped).toBe(3);
    expect(rows).toEqual([
      {
        title: "BoJack Horseman",
        type: "tv",
        list: "watched",
        refs: ["netflix:70300800"],
        date: "2026-11-11",
        episodes: [
          { season: undefined, name: "Year in Review", date: "2026-10-04" },
          { season: 2, name: "Nothing to Remember", date: "2026-11-01" },
          { season: 5, name: "The Stopped Show", date: "2026-11-08" },
          { season: 5, name: "The Showstopper", date: "2026-11-09" },
        ],
      },
      { title: "Glass Onion", type: "movie", list: "watched", date: "2026-11-10", refs: ["netflix:81000001"] },
    ]);
  });
});

describe("readNetflixHistory with Netflix's metadata", () => {
  it("uses the real numbers and leaves out what you only started", () => {
    const at = (d: string) => new Date(`${d}T21:00:00`).getTime();
    const show = { series: 70300800, seriesTitle: "BoJack Horseman", seasonDescriptor: "Season 5" };
    const { rows, skipped } = readNetflixHistory([
      {
        ...show,
        movieID: 2,
        date: at("2026-11-12"),
        episodeTitle: "Free Churro",
        season: 5,
        episode: 6,
        finished: true,
      },
      { movieID: 9, date: at("2026-11-11"), title: "Mickey 17", finished: false }, // started, 42 seconds in
      { ...show, movieID: 1, date: at("2026-11-10"), episodeTitle: "Episode 1", season: 5, episode: 1, finished: true },
      {
        ...show,
        movieID: 3,
        date: at("2026-11-09"),
        episodeTitle: "Brand New Couch",
        season: 5,
        episode: 2,
        finished: false,
      },
    ]);
    expect(skipped).toBe(2);
    expect(rows).toEqual([
      {
        title: "BoJack Horseman",
        type: "tv",
        list: "watched",
        refs: ["netflix:70300800"],
        date: "2026-11-12",
        episodes: [
          { season: 5, episode: 1, name: "Episode 1", date: "2026-11-10" },
          { season: 5, episode: 6, name: "Free Churro", date: "2026-11-12" },
        ],
      },
    ]);
  });
});

describe("readCrunchyrollWatchlist", () => {
  it("turns the watchlist into one row per series (with its id) and per film", () => {
    const ep = (id: string, title: string) => ({
      panel: { type: "episode", title: "Some episode", episode_metadata: { series_id: id, series_title: title } },
    });
    expect(
      readCrunchyrollWatchlist([
        ep("G6NQ5DWZ6", "My Hero Academia"),
        ep("G6NQ5DWZ6", "My Hero Academia"), // twice: once
        {
          panel: {
            type: "movie",
            title: "JUJUTSU KAISEN 0",
            movie_metadata: { movie_listing_title: "JUJUTSU KAISEN 0" },
          },
        },
        { panel: { type: "episode", episode_metadata: { series_id: "X", series_title: " " } } }, // no name
      ]),
    ).toEqual([
      { title: "My Hero Academia", type: "tv", list: "watchlist", refs: ["crunchyroll:G6NQ5DWZ6"] },
      { title: "JUJUTSU KAISEN 0", type: "movie", list: "watchlist" },
    ]);
  });
});

describe("readNetflixWatchlist", () => {
  it("keeps the list's order and ids, a film's year, no show year, skips the empty slots past the end", () => {
    // trimmed from Netflix's real answer (2026-11-16): both One Pieces say 2026, the latest season's year
    const ref = (id: number) => ({ $type: "ref", value: ["videos", String(id)] });
    const video = (title: string, releaseYear: number, type: string) => ({
      title: { $type: "atom", value: title },
      releaseYear: { $type: "atom", value: releaseYear },
      summary: { $type: "atom", value: { type, unifiedEntityId: "Video:1", id: 1, isOriginal: false } },
    });
    expect(
      readNetflixWatchlist({
        jsonGraph: {
          mylist: {
            "0": ref(80107103),
            "1": ref(80217863),
            "2": ref(80230399),
            "3": ref(1), // gone from Netflix: no video
            "4": { $type: "atom" },
            "5": { $type: "atom" },
          },
          videos: {
            "80107103": video("One Piece", 2026, "show"),
            "80217863": video("ONE PIECE", 2026, "show"),
            "80230399": video("Extraction", 2020, "movie"),
          },
        },
      }),
    ).toEqual([
      { title: "One Piece", type: "tv", list: "watchlist", refs: ["netflix:80107103"] },
      { title: "ONE PIECE", type: "tv", list: "watchlist", refs: ["netflix:80217863"] },
      { title: "Extraction", year: 2020, type: "movie", list: "watchlist", refs: ["netflix:80230399"] },
    ]);
    expect(readNetflixWatchlist({})).toEqual([]);
  });
});

describe("readPrimeWatchlist", () => {
  it("makes a series of its seasons and keeps a film's year", () => {
    expect(
      readPrimeWatchlist([
        { displayTitle: "Halo - Season 1", entityType: "TV Show", releaseYear: "2022", titleID: "B01" },
        { displayTitle: "Halo - Season 2", entityType: "TV Show", releaseYear: "2024" },
        { displayTitle: "REACHER (TV) - SEASON 01", entityType: "TV Show" },
        { displayTitle: "Hunter x Hunter - Staffel 1", entityType: "TV Show" },
        { displayTitle: "The Loud House Season 1", entityType: "TV Show" },
        { displayTitle: "V/H/S [dt./OV]", entityType: "Movie", releaseYear: "2012", titleID: "B0X" },
        { displayTitle: " ", entityType: "Movie" },
      ]),
    ).toEqual([
      { title: "Halo", type: "tv", list: "watchlist" },
      { title: "REACHER", type: "tv", list: "watchlist" },
      { title: "Hunter x Hunter", type: "tv", list: "watchlist" },
      { title: "The Loud House", type: "tv", list: "watchlist" },
      { title: "V/H/S", year: 2012, type: "movie", list: "watchlist", refs: ["prime:B0X"] },
    ]);
  });
});
