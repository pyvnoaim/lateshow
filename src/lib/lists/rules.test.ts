import { describe, expect, it } from "vitest";
import { canSeeList } from "./rules";

const mine = (visibility: "private" | "friends" | "link") => ({ userId: "me", visibility });

describe("canSeeList", () => {
  it("always shows the owner their list", () => {
    expect(canSeeList(mine("private"), "me", false)).toBe(true);
  });
  it("keeps private lists to the owner, friends too", () => {
    expect(canSeeList(mine("private"), "friend", true)).toBe(false);
  });
  it("shows friends lists only to friends who are signed in", () => {
    expect(canSeeList(mine("friends"), "friend", true)).toBe(true);
    expect(canSeeList(mine("friends"), "stranger", false)).toBe(false);
    expect(canSeeList(mine("friends"), null, false)).toBe(false);
  });
  it("shows link lists to anyone, signed out too", () => {
    expect(canSeeList(mine("link"), null, false)).toBe(true);
  });
});
