import { describe, expect, it } from "vitest";
import { nextWithQuery, safeNext } from "@/lib/safeNext";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/u/me?tab=watchlist")).toBe("/u/me?tab=watchlist");
    expect(safeNext(["/cinemas", "/x"])).toBe("/cinemas");
  });

  it("sends anything else home", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  it("rejects tricks browsers would turn into another site", () => {
    expect(safeNext("/\t/evil.com")).toBe("/");
    expect(safeNext("/\n/evil.com")).toBe("/");
    expect(safeNext("/\u0000evil")).toBe("/");
    expect(safeNext("/x\\evil.com")).toBe("/");
  });
});

describe("nextWithQuery", () => {
  it("takes the page's own query from /login back along, never next or error, never over next's own", () => {
    expect(nextWithQuery("/settings", { next: "/settings", import: "extension", error: "x" })).toBe(
      "/settings?import=extension",
    );
    expect(nextWithQuery("/u/me?year=2024", { next: "/u/me", year: "2025", tab: "history" })).toBe(
      "/u/me?year=2024&tab=history",
    );
    expect(nextWithQuery("/", { next: "//evil.com", a: ["1", "2"] })).toBe("/");
  });
});
