import { expect, it } from "vitest";
import { thumb } from "./scrollThumb";

it("fills its share and stops at the end", () => {
  expect(thumb(10, 300, 1000, 0)).toEqual([0, 3]);
  expect(thumb(10, 300, 1000, 700)).toEqual([7, 3]); // scrolled to the end: flush with the bottom
  expect(thumb(10, 10, 100_000, 99_990)).toEqual([9, 1]); // a long page still shows one cell, last
});

it("stays a thumb on a page that barely scrolls", () => {
  expect(thumb(20, 900, 1000, 0)).toEqual([0, 8]); // 90 % visible, but capped at 40 % of the rail
  expect(thumb(20, 900, 1000, 100)).toEqual([12, 8]); // and it still reaches the bottom
});
