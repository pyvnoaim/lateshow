import { expect, it } from "vitest";
import { thumb } from "./scrollThumb";

it("fills its share and stops at the end", () => {
  expect(thumb(10, 500, 1000, 0)).toEqual([0, 5]);
  expect(thumb(10, 500, 1000, 500)).toEqual([5, 5]); // scrolled to the end: flush with the bottom
  expect(thumb(10, 10, 100_000, 99_990)).toEqual([9, 1]); // a long page still shows one cell, last
});
