import { describe, expect, it } from "vitest";
import { cleanCode, cleanGuestName, newRoomCode } from "./rules";

describe("rooms rules", () => {
  it("makes 4 character codes that cleanCode accepts", () => {
    const code = newRoomCode();
    expect(code).toMatch(/^[A-Z2-9]{4}$/);
    expect(cleanCode(code)).toBe(code);
  });
  it("cleans typed codes, rejects look-alikes", () => {
    expect(cleanCode(" k3x9 ")).toBe("K3X9");
    expect(cleanCode("K0X9")).toBeNull();
    expect(cleanCode("K3X")).toBeNull();
  });
  it("cleans guest names", () => {
    expect(cleanGuestName("  Ben   K ")).toBe("Ben K");
    expect(cleanGuestName("   ")).toBeNull();
    expect(cleanGuestName("x".repeat(21))).toBeNull();
  });
});
