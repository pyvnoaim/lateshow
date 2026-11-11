import { describe, expect, it } from "vitest";
import { safeNext } from "./next";

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
