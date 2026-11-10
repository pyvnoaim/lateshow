import { describe, expect, it } from "vitest";
import { pick } from "./pick";

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
