import { describe, expect, it } from "vitest";
import { bracketState } from "./bracket";

const deck = [1, 2, 3, 4, 5, 6, 7, 8];
const votes = (entries: [number, Record<string, number>][]) =>
  new Map(entries.map(([m, v]) => [m, new Map(Object.entries(v))]));

describe("bracketState", () => {
  it("starts on the first quarterfinal", () => {
    const s = bracketState(deck, new Map(), ["a", "b"]);
    expect(s.current).toMatchObject({ index: 0, a: 1, b: 2, winner: null });
  });
  it("waits for everyone, then the majority wins and feeds the next round", () => {
    const half = bracketState(deck, votes([[0, { a: 2 }]]), ["a", "b", "c"]);
    expect(half.current?.index).toBe(0);
    const done = bracketState(
      deck,
      votes([
        [0, { a: 2, b: 2, c: 1 }],
        [1, { a: 3, b: 3, c: 3 }],
      ]),
      ["a", "b", "c"],
    );
    expect(done.matches[0].winner).toBe(2);
    expect(done.current?.index).toBe(2);
    expect(done.matches[4]).toMatchObject({ a: 2, b: 3 });
  });
  it("breaks a tie for the higher seed", () => {
    const s = bracketState(deck, votes([[0, { a: 1, b: 2 }]]), ["a", "b"]);
    expect(s.matches[0].winner).toBe(1);
  });
  it("crowns a champion after the final", () => {
    const all = (pick: (m: number) => number) =>
      votes([0, 1, 2, 3, 4, 5, 6].map((m) => [m, { a: pick(m) }] as [number, Record<string, number>]));
    // a always picks the first entrant of each match
    const s = bracketState(
      deck,
      all((m) => [1, 3, 5, 7, 1, 5, 1][m]),
      ["a"],
    );
    expect(s.champion).toBe(1);
    expect(s.current).toBeNull();
  });
});
