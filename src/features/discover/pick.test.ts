import { describe, expect, it } from "vitest";
import { deal, pick } from "./pick";

const items = Array.from({ length: 20 }, (_, i) => i);

describe("pick", () => {
  it("returns distinct items from the list", () => {
    const out = pick(items, 3, 42);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    out.forEach((x) => expect(items).toContain(x));
  });

  it("is the same for the same seed and changes with the seed", () => {
    expect(pick(items, 3, 7)).toEqual(pick(items, 3, 7));
    expect(pick(items, 3, 7)).not.toEqual(pick(items, 3, 8));
  });

  it("copes with short lists", () => {
    expect(pick([1], 3, 1)).toEqual([1]);
    expect(pick([], 3, 1)).toEqual([]);
  });
});

describe("deal", () => {
  const pool = Array.from({ length: 30 }, (_, i) => ({ id: i, genre_ids: [i % 5] }));

  it("gives three different genres and no repeats across the first rolls", () => {
    const seen = new Set<number>();
    for (let roll = 1; roll <= 5; roll++) {
      const out = deal(pool, 3, roll, 9);
      expect(new Set(out.map((x) => x.genre_ids[0])).size).toBe(3);
      out.forEach((x) => seen.add(x.id));
    }
    expect(seen.size).toBe(15);
  });

  it("fills up when genres run out and copes with short pools", () => {
    expect(
      deal(
        [
          { id: 1, genre_ids: [1] },
          { id: 2, genre_ids: [1] },
          { id: 3, genre_ids: [1] },
          { id: 4, genre_ids: [1] },
        ],
        3,
        1,
        1,
      ),
    ).toHaveLength(3);
    expect(deal([{ id: 1, genre_ids: [] }], 3, 1, 1)).toHaveLength(1);
    expect(deal([], 3, 1, 1)).toEqual([]);
  });
});
