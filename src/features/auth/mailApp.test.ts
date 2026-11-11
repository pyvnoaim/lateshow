import { describe, expect, it } from "vitest";
import { mailApp } from "./mailApp";

describe("mailApp", () => {
  it("finds the webmail for common providers", () => {
    expect(mailApp("a@gmail.com")?.name).toBe("Gmail");
    expect(mailApp("a@Hotmail.de")?.name).toBe("Outlook");
    expect(mailApp("a@icloud.com")?.name).toBe("iCloud Mail");
    expect(mailApp("a@gmx.de")?.name).toBe("GMX");
  });
  it("returns null for anything else", () => {
    expect(mailApp("a@company.com")).toBeNull();
    expect(mailApp("a@notgmail.com")).toBeNull();
  });
});
