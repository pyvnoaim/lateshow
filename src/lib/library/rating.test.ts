import { describe, expect, it } from "vitest";
import { fromScore } from "./rating";

describe("fromScore", () => {
  it("maps scores out of 10", () => {
    expect([10, 9, 8, 6, 5, 4, 1].map(fromScore)).toEqual([2, 2, 1, 1, undefined, -1, -1]);
  });
  it("ignores missing or zero scores", () => {
    expect(fromScore(0)).toBeUndefined();
    expect(fromScore(NaN)).toBeUndefined();
  });
});
