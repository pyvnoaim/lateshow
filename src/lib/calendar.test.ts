import { describe, expect, it } from "vitest";
import { buildIcs, fold, makeCalendarToken, verifyCalendarToken } from "./calendar";

const secret = "x".repeat(32);

describe("calendar token", () => {
  it("round trips and rejects anything else", () => {
    const token = makeCalendarToken("user.1", secret);
    expect(token.split(".").at(-1)).toHaveLength(22);
    expect(verifyCalendarToken(token, secret)).toBe("user.1");
    expect(verifyCalendarToken(token, "y".repeat(32))).toBeNull();
    expect(verifyCalendarToken(`other.${token.split(".").at(-1)}`, secret)).toBeNull();
    expect(verifyCalendarToken(token.slice(0, -1), secret)).toBeNull();
    expect(verifyCalendarToken("nodot", secret)).toBeNull();
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(
    [{ uid: "a@lateshow", date: "2026-12-31", summary: "Show, Part; 2\\x", url: "https://x/title/tv/1" }],
    new Date("2026-11-12T08:09:10.123Z"),
  );

  it("writes all-day events with CRLF and escapes text", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101\r\n");
    expect(ics).toContain("DTSTAMP:20261112T080910Z\r\n");
    expect(ics).toContain("SUMMARY:Show\\, Part\\; 2\\\\x\r\n");
    expect(ics).toContain("X-WR-CALNAME:Lateshow");
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("folds at 75 octets without splitting characters", () => {
    const folded = fold("SUMMARY:" + "ü".repeat(60));
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((l) => l.startsWith(" "))).toBe(true);
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe("SUMMARY:" + "ü".repeat(60));
  });
});
