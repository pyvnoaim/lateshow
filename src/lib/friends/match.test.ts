import { describe, expect, it } from "vitest";
import { tasteMatch, type Taste } from "./match";

const taste = (ids: number[], genres: [number, number][]): Taste => ({
  titles: new Set(ids.map((i) => `movie-${i}`)),
  genres: new Map(genres),
});
const ten = Array.from({ length: 10 }, (_, i) => i);

describe("tasteMatch", () => {
  it("is 100 for the same history", () => {
    const t = taste(ten, [
      [18, 5],
      [80, 3],
    ]);
    expect(tasteMatch(t, t)).toBe(100);
  });
  it("is 0 with nothing in common", () => {
    expect(
      tasteMatch(
        taste(ten, [[18, 5]]),
        taste(
          ten.map((i) => i + 100),
          [[35, 5]],
        ),
      ),
    ).toBe(0);
  });
  it("counts shared titles against the smaller list", () => {
    const small = taste(ten, [[18, 1]]);
    const big = taste([...ten, ...ten.map((i) => i + 50)], [[18, 1]]);
    expect(tasteMatch(small, big)).toBe(100);
  });
  it("needs 10 titles each", () => {
    expect(tasteMatch(taste([1, 2, 3], [[18, 1]]), taste(ten, [[18, 1]]))).toBeNull();
  });
});
