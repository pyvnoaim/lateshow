import { describe, expect, it } from "vitest";
import { yearGrid } from "./yearGrid";

const today = new Date("2026-11-10T20:00:00Z"); // a Tuesday

describe("yearGrid", () => {
  it("covers 52 full weeks plus this week up to today, starting on a Sunday", () => {
    const days = yearGrid([], today);
    expect(days).toHaveLength(52 * 7 + 3);
    expect(new Date(days[0].date).getUTCDay()).toBe(0);
    expect(days.at(-1)?.date).toBe("2026-11-10");
  });

  it("scales levels to the busiest day and sums a day's watches", () => {
    const days = yearGrid(
      [
        { at: new Date("2026-11-08T21:00:00Z"), minutes: 60 },
        { at: new Date("2026-11-08T23:00:00Z"), minutes: 60 },
        { at: new Date("2026-11-09T21:00:00Z"), minutes: 30 },
        { at: new Date("2026-11-10T21:00:00Z"), minutes: 0 },
      ],
      today,
    );
    const at = (d: string) => days.find((x) => x.date === d);
    expect(at("2026-11-08")).toEqual({ date: "2026-11-08", minutes: 120, level: 4 });
    expect(at("2026-11-09")?.level).toBe(1);
    expect(at("2026-11-10")?.level).toBe(1);
  });

  it("ignores watches older than the grid, also for scaling", () => {
    const days = yearGrid(
      [
        { at: new Date("2024-01-01T12:00:00Z"), minutes: 600 },
        { at: new Date("2026-11-09T21:00:00Z"), minutes: 30 },
      ],
      today,
    );
    expect(days.filter((d) => d.level > 0)).toEqual([{ date: "2026-11-09", minutes: 30, level: 4 }]);
  });

  it("shows a calendar year padded back to a Sunday, counting only that year", () => {
    const days = yearGrid(
      [
        { at: new Date("2024-12-31T12:00:00Z"), minutes: 600 },
        { at: new Date("2025-03-01T12:00:00Z"), minutes: 30 },
      ],
      today,
      2025,
    );
    // Jan 1 2025 is a Wednesday: Sun to Tue of 2024 pad the first week
    expect(days.slice(0, 3).every((d) => d.pad && d.level === 0)).toBe(true);
    expect(days[3]).toEqual({ date: "2025-01-01", minutes: 0, level: 0 });
    expect(days.at(-1)?.date).toBe("2025-12-31");
    expect(days.filter((d) => d.level > 0)).toEqual([{ date: "2025-03-01", minutes: 30, level: 4 }]);
  });
});
