import { expect, test } from "vitest";
import { isRewatch } from "./rewatch";

const day = 86_400_000;
const now = new Date("2026-11-17T21:00:00Z");

test("months later is a rewatch, the same viewing again is not", () => {
  expect(isRewatch(now, [new Date(now.getTime() - 180 * day)])).toBe(true);
  expect(isRewatch(now, [new Date(now.getTime() - day)])).toBe(false); // a sync's date a day off
  expect(isRewatch(now, [new Date(now.getTime() + day)])).toBe(false);
  expect(isRewatch(now, [new Date(now.getTime() - 180 * day), new Date(now.getTime() - 3 * day)])).toBe(true);
  expect(isRewatch(now, [new Date(now.getTime() - 180 * day), now])).toBe(false);
});

test("a watch with no date makes now a rewatch", () => {
  expect(isRewatch(now, [null])).toBe(true);
});
