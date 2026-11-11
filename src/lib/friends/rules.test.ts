import { describe, expect, it } from "vitest";
import { inviteState, newInviteCode, pair } from "./rules";

describe("friends rules", () => {
  it("makes unambiguous 10 letter codes", () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[a-hjkmnp-z2-9]{10}$/);
    expect(newInviteCode()).not.toBe(code);
  });
  it("stores a pair the same way round", () => {
    expect(pair("b", "a")).toEqual({ a: "a", b: "b" });
    expect(pair("a", "b")).toEqual(pair("b", "a"));
  });
  it("tells why an invite can't be used", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    const inv = { userId: "host", expiresAt: new Date("2026-11-12T00:00:00Z"), usesLeft: 2 };
    expect(inviteState(inv, "guest", now)).toBe("ok");
    expect(inviteState(inv, null, now)).toBe("ok");
    expect(inviteState(inv, "host", now)).toBe("own");
    expect(inviteState({ ...inv, usesLeft: 0 }, "guest", now)).toBe("used");
    expect(inviteState({ ...inv, expiresAt: now }, "guest", now)).toBe("expired");
  });
});
