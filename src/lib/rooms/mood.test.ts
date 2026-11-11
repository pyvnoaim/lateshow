import { describe, expect, it } from "vitest";
import { isEmptyMood, parseMood } from "./mood";

describe("parseMood", () => {
  it("maps feelings to genres, movie and series ids apart", () => {
    expect(parseMood("Mind-bending")).toMatchObject({ movieGenres: [9648, 878], tvGenres: [9648, 10765] });
    expect(parseMood("something scary")).toMatchObject({ movieGenres: [27] });
    expect(parseMood("Cozy feel good").movieGenres.toSorted()).toEqual([10751, 35].toSorted());
  });
  it("reads lengths and eras", () => {
    expect(parseMood("under 90 min")).toMatchObject({ maxMinutes: 90 });
    expect(parseMood("80s classics")).toMatchObject({ from: "1980-01-01", to: "1989-12-31" });
    expect(parseMood("2010s")).toMatchObject({ from: "2010-01-01", to: "2019-12-31" });
    expect(parseMood("new", new Date("2026-11-11"))).toMatchObject({ from: "2024-01-01" });
  });
  it("knows when it understood nothing", () => {
    expect(isEmptyMood(parseMood("heist with a twist"))).toBe(false);
    expect(isEmptyMood(parseMood("time loop"))).toBe(true);
  });
});
