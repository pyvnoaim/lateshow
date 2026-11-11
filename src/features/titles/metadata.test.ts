import { describe, expect, it } from "vitest";
import { clip } from "./metadata";

describe("clip", () => {
  it("leaves short text alone", () => {
    expect(clip("A chemistry teacher.", 200)).toBe("A chemistry teacher.");
  });
  it("cuts long text at a word and stays within the limit", () => {
    const out = clip("one two three four five", 12);
    expect(out).toBe("one two…");
    expect(out.length).toBeLessThanOrEqual(12);
  });
});
