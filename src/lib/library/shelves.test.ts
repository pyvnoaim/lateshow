import { describe, expect, it } from "vitest";
import { daysUntil, readableNames, shelfFor, sortShelf } from "./shelves";

describe("shelfFor", () => {
  const base = { release: "2024-01-01", today: "2026-11-11", onYours: false, elsewhere: false };
  it("sorts a title by what you can do tonight", () => {
    expect(shelfFor({ ...base, release: "2026-12-17", onYours: true })).toBe("coming");
    expect(shelfFor({ ...base, onYours: true })).toBe("now");
    expect(shelfFor({ ...base, elsewhere: true })).toBe("rent");
    expect(shelfFor(base)).toBe("nowhere");
    expect(shelfFor({ ...base, release: null, onYours: true })).toBe("now");
  });
});

describe("daysUntil", () => {
  it("rounds up and never goes negative", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(daysUntil("2026-11-17T23:59:00Z", now)).toBe(7);
    expect(daysUntil("2026-11-11T18:00:00Z", now)).toBe(1);
    expect(daysUntil("2026-11-01T00:00:00Z", now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe("sortShelf", () => {
  const t = (id: number, leavesIn: number | null, daysAgo: number, rating: number, minutes: number | null) => ({
    id,
    leavesIn,
    addedAt: new Date(Date.UTC(2026, 10, 11 - daysAgo)),
    rating,
    minutes,
  });
  const items = [t(1, null, 1, 7, 120), t(2, 6, 9, 8, 90), t(3, 3, 4, 6, null), t(4, null, 0, 9, 45)];
  it("leaving soon first, then newest", () => {
    expect(sortShelf(items, "leaving").map((i) => i.id)).toEqual([3, 2, 4, 1]);
  });
  it("by added, rating and length", () => {
    expect(sortShelf(items, "added").map((i) => i.id)).toEqual([4, 1, 3, 2]);
    expect(sortShelf(items, "rating").map((i) => i.id)).toEqual([4, 2, 1, 3]);
    expect(sortShelf(items, "shortest").map((i) => i.id)).toEqual([4, 2, 1, 3]);
  });
});

describe("readableNames", () => {
  it("names each service once and skips add-on channels when a real service is there", () => {
    expect(readableNames(["Prime Video", "Prime Video", "HBO Max Amazon Channel", "HBO Max"])).toEqual([
      "Prime Video",
      "HBO Max",
    ]);
    expect(readableNames(["Amazon Arthaus Channel"])).toEqual(["Amazon Arthaus Channel"]);
  });
});
