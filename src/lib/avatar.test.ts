import { describe, expect, it } from "vitest";
import { isAvatarValue, parseAvatar } from "./avatar";

describe("parseAvatar", () => {
  it("reads tones and TMDB photo paths", () => {
    expect(parseAvatar("c:mint")).toEqual({ kind: "tone", tone: "mint" });
    expect(parseAvatar("p:/kU3B75TyRiCgE270EyZnHjfivoq.jpg")).toEqual({
      kind: "photo",
      path: "/kU3B75TyRiCgE270EyZnHjfivoq.jpg",
    });
  });
  it("renders nothing it doesn't know (the field is client-writable)", () => {
    for (const bad of [
      null,
      "",
      "c:red",
      "https://evil.example/x.jpg",
      "p:/../x.jpg",
      "p:/a b.jpg",
      "javascript:alert(1)",
    ])
      expect(parseAvatar(bad)).toBeNull();
    expect(isAvatarValue("")).toBe(true);
    expect(isAvatarValue("https://evil.example/x.jpg")).toBe(false);
  });
});
