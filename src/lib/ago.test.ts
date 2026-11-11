import { describe, expect, it } from "vitest";
import { ago } from "./ago";

describe("ago", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  const before = (ms: number) => new Date(now.getTime() - ms);
  it("says it short", () => {
    expect(ago(before(20_000), now)).toBe("just now");
    expect(ago(before(5 * 60_000), now)).toBe("5 min ago");
    expect(ago(before(60 * 60_000), now)).toBe("1 hour ago");
    expect(ago(before(30 * 3600_000), now)).toBe("yesterday");
    expect(ago(before(3 * 86400_000), now)).toBe("3 days ago");
    expect(ago(new Date("2026-11-02T10:00:00Z"), now)).toBe("Nov 2");
  });
});
