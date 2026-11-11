import { describe, expect, it } from "vitest";
import { cinemaDate, pickLogo, pickTrailer, serviceName, toCards, type Card, type Video } from "./tmdb";

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

describe("cinemaDate", () => {
  const rd = (country: string, dates: [number, string][]) => ({
    iso_3166_1: country,
    release_dates: dates.map(([type, release_date]) => ({ type, release_date })),
  });

  it("prefers the German theatrical date over limited and other countries", () => {
    const t = {
      release_date: "2026-11-01",
      release_dates: {
        results: [
          rd("US", [[3, "2026-11-01T00:00:00Z"]]),
          rd("DE", [
            [2, "2026-11-20T00:00:00Z"],
            [3, "2026-12-18T00:00:00Z"],
          ]),
        ],
      },
    };
    expect(cinemaDate(t, "DE")).toBe("2026-12-18");
  });

  it("falls back to the main release date", () => {
    expect(cinemaDate({ release_date: "2026-11-01", release_dates: { results: [] } }, "DE")).toBe("2026-11-01");
    expect(cinemaDate({}, "DE")).toBeNull();
  });
});

describe("pickTrailer", () => {
  const v = (key: string, type: string, official: boolean, site = "YouTube"): Video => ({ key, type, official, site });

  it("takes the official YouTube trailer first", () => {
    expect(pickTrailer([v("a", "Teaser", true), v("b", "Trailer", false), v("c", "Trailer", true)])?.key).toBe("c");
  });

  it("falls back to any YouTube trailer, never other sites", () => {
    expect(pickTrailer([v("x", "Trailer", true, "Vimeo"), v("b", "Trailer", false)])?.key).toBe("b");
    expect(pickTrailer([v("x", "Trailer", true, "Vimeo")])).toBeUndefined();
  });
});

describe("pickLogo", () => {
  const logo = (iso_639_1: string | null, file_path: string) => ({ iso_639_1, file_path, aspect_ratio: 3 });
  it("prefers English, then a language-free logo", () => {
    expect(
      pickLogo({ images: { logos: [logo("de", "/de.png"), logo(null, "/x.png"), logo("en", "/en.png")] } })?.path,
    ).toBe("/en.png");
    expect(pickLogo({ images: { logos: [logo("de", "/de.png"), logo(null, "/x.png")] } })?.path).toBe("/x.png");
    expect(pickLogo({ images: { logos: [logo("de", "/de.png")] } })).toBeNull();
    expect(pickLogo({})).toBeNull();
  });
});

describe("serviceName", () => {
  it("writes service names the way people say them", () => {
    expect(serviceName("Paramount Plus")).toBe("Paramount+");
    expect(serviceName("Disney Plus")).toBe("Disney+");
    expect(serviceName("Amazon Prime Video")).toBe("Prime Video");
    expect(serviceName("Netflix Standard with Ads")).toBe("Netflix");
    expect(serviceName("Netflix")).toBe("Netflix");
  });
});
