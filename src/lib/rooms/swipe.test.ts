import { describe, expect, it } from "vitest";
import { findMatch, roomServices, seededShuffle } from "./swipe";

describe("roomServices", () => {
  it("keeps what everyone has", () => {
    expect(
      roomServices([
        [8, 337, 9],
        [8, 337],
        [337, 8, 2],
      ]),
    ).toEqual([8, 337]);
  });
  it("ignores people without services, falls back to anyone's, then to none", () => {
    expect(roomServices([[8], [], [8, 9]])).toEqual([8]);
    expect(roomServices([[8], [9]])).toEqual([8, 9]);
    expect(roomServices([[], []])).toEqual([]);
  });
});

describe("seededShuffle", () => {
  it("is the same for the same room, different across rooms, and keeps every item", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(seededShuffle(items, "K3X9")).toEqual(seededShuffle(items, "K3X9"));
    expect(seededShuffle(items, "K3X9")).not.toEqual(seededShuffle(items, "ABCD"));
    expect(seededShuffle(items, "K3X9").toSorted((a, b) => a - b)).toEqual(items);
  });
});

describe("findMatch", () => {
  const likes = new Map([
    [10, new Set(["a", "b"])],
    [20, new Set(["a", "b", "c"])],
    [30, new Set(["a", "b", "c"])],
  ]);
  it("first title in deck order that everyone liked", () => {
    expect(findMatch([10, 30, 20], likes, ["a", "b", "c"])).toBe(30);
    expect(findMatch([10], likes, ["a", "b", "c"])).toBeNull();
    expect(findMatch([10], likes, ["a", "b"])).toBe(10);
  });
});
