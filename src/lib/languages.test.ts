import { describe, expect, it } from "vitest";
import { pickLanguage } from "./languages";

describe("pickLanguage", () => {
  it("uses the saved choice first", () => {
    expect(pickLanguage("fr-FR", "de-DE,de;q=0.9")).toBe("fr-FR");
  });
  it("falls back to the browser's first language we have", () => {
    expect(pickLanguage(undefined, "de-AT,de;q=0.9,en;q=0.8")).toBe("de-DE");
    expect(pickLanguage(undefined, "ja-JP,pt-PT;q=0.8")).toBe("pt-BR");
  });
  it("ignores junk and defaults to English", () => {
    expect(pickLanguage("xx", "*")).toBe("en-US");
    expect(pickLanguage(undefined, null)).toBe("en-US");
  });
});
