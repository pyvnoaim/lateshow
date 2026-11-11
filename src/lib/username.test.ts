import { describe, expect, it } from "vitest";
import { checkUsername } from "./username";

describe("checkUsername", () => {
  it("cleans and accepts good names", () => {
    expect(checkUsername("  @Leon_99 ")).toEqual({ ok: true, value: "leon_99" });
  });
  it("rejects short, long, odd characters and reserved words", () => {
    expect(checkUsername("ab").ok).toBe(false);
    expect(checkUsername("a".repeat(21)).ok).toBe(false);
    expect(checkUsername("leon!").ok).toBe(false);
    expect(checkUsername("léon").ok).toBe(false);
    expect(checkUsername("Admin")).toEqual({ ok: false, error: "That one is taken." });
  });
});
