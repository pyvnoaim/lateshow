import { describe, expect, it } from "vitest";
import { isAvatarValue, parseTone } from "./avatar";

describe("parseTone", () => {
  it("reads known tones", () => {
    expect(parseTone("c:mint")).toBe("mint");
  });
  it("ignores anything else (the field is client-writable)", () => {
    for (const bad of [null, "", "c:red", "https://evil.example/x.jpg", "p:/abc.jpg", "javascript:alert(1)"])
      expect(parseTone(bad)).toBeNull();
    expect(isAvatarValue("")).toBe(true);
    expect(isAvatarValue("https://evil.example/x.jpg")).toBe(false);
  });
});
