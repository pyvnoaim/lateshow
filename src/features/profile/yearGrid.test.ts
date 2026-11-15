import { describe, expect, it } from "vitest";
import { yearGrid } from "./yearGrid";

const today = new Date("2026-11-10T20:00:00Z"); // a Tuesday

describe("yearGrid", () => {
  it("covers Jan 1 to Dec 31, padded back to a Sunday", () => {
    const days = yearGrid([], today, 2025);
    // Jan 1 2025 is a Wednesday: Sun to Tue of 2024 pad the first week
    expect(days.slice(0, 3).every((d) => d.pad)).toBe(true);
    expect(days[3]).toEqual({ date: "2025-01-01", minutes: 0, level: 0 });
    expect(days.at(-1)).toEqual({ date: "2025-12-31", minutes: 0, level: 0 });
  });

  it("pads the days after today in the current year", () => {
    const days = yearGrid([{ at: new Date("2026-11-20T12:00:00Z"), minutes: 60 }], today, 2026);
    expect(days.find((d) => d.date === "2026-11-10")?.pad).toBeUndefined();
    expect(days.filter((d) => d.date > "2026-11-10").every((d) => d.pad && d.level === 0)).toBe(true);
  });

  it("shades by quarter of your watching days, so one huge day doesn't flatten the rest", () => {
    const days = yearGrid(
      [
        { at: new Date("2026-11-01T21:00:00Z"), minutes: 30 },
        { at: new Date("2026-11-02T21:00:00Z"), minutes: 60 },
        { at: new Date("2026-11-03T21:00:00Z"), minutes: 120 },
        { at: new Date("2026-11-04T21:00:00Z"), minutes: 200 },
        { at: new Date("2026-11-04T23:00:00Z"), minutes: 100 },
        { at: new Date("2026-11-05T21:00:00Z"), minutes: 6000 },
      ],
      today,
      2026,
    );
    const level = (d: string) => days.find((x) => x.date === d)?.level;
    expect(["01", "02", "03", "04", "05", "06"].map((d) => level(`2026-11-${d}`))).toEqual([1, 1, 2, 3, 4, 0]);
    expect(days.find((x) => x.date === "2026-11-04")?.minutes).toBe(300);
  });

  it("counts only that year, also for scaling", () => {
    const days = yearGrid(
      [
        { at: new Date("2024-12-31T12:00:00Z"), minutes: 600 },
        { at: new Date("2025-03-01T12:00:00Z"), minutes: 30 },
      ],
      today,
      2025,
    );
    expect(days.filter((d) => d.level > 0)).toEqual([{ date: "2025-03-01", minutes: 30, level: 1 }]);
  });
});
