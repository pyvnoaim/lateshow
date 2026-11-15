import { describe, expect, it } from "vitest";
import { start, tick, type Progress, type Tick } from "@/lib/watchProgress";

const run = (ticks: Tick[], from: Progress = start()) => ticks.reduce((p, t) => tick(p, t), from);
// ticks every second from `a` to `b` of a video `len` long
const play = (a: number, b: number, len: number, extra: Partial<Tick> = {}) =>
  Array.from({ length: b - a + 1 }, (_, i) => ({ at: a + i, duration: len, ...extra }));

describe("watchProgress", () => {
  it("finishes at 90% after watching it through", () => {
    const p = run(play(0, 2700, 3000));
    expect(p.finished).toBe(true);
    expect(Math.round(p.watched)).toBe(2700);
  });

  it("finishes at the credits signal before 90%", () => {
    const p = run([...play(0, 2400, 3000), { at: 2401, duration: 3000, credits: true }]);
    expect(p.finished).toBe(true);
  });

  it("doesn't count a jump to the end", () => {
    const p = run([...play(0, 300, 3000), { at: 2950, duration: 3000 }, ...play(2951, 2999, 3000)]);
    expect(p.finished).toBe(false);
    expect(Math.round(p.watched)).toBe(349);
  });

  it("doesn't count ads", () => {
    const p = run([...play(0, 1000, 3000), ...play(1001, 2000, 3000, { ad: true }), ...play(2001, 2800, 3000)]);
    expect(Math.round(p.watched)).toBe(1800);
  });

  it("counts faster playback as playing", () => {
    const p = run(Array.from({ length: 1400 }, (_, i) => ({ at: i * 2, duration: 3000, rate: 2 })));
    expect(p.finished).toBe(true);
  });

  it("takes a lower share for a test build", () => {
    const skimmed = [...play(0, 120, 3000), { at: 2750, duration: 3000 }, ...play(2751, 2760, 3000)];
    expect(run(skimmed).finished).toBe(false);
    expect(skimmed.reduce((p, t) => tick(p, t, 0.02), start()).finished).toBe(true);
  });

  it("never finishes a trailer", () => {
    expect(run(play(0, 120, 120)).finished).toBe(false);
  });

  it("starts over on the next episode just as long", () => {
    const next = run(play(0, 2700, 3000), run(play(0, 2700, 3000)));
    expect(next.finished).toBe(true);
    expect(run(play(0, 10, 3000), run(play(0, 2700, 3000))).finished).toBe(false);
  });

  it("starts over on the next episode (another length)", () => {
    const first = run(play(0, 2700, 3000));
    const next = run(play(0, 60, 2900), first);
    expect(next.finished).toBe(false);
    expect(Math.round(next.watched)).toBe(60);
  });
});
