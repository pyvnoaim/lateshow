import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { codeEmail, spaced } = await import("./mail");

describe("codeEmail", () => {
  it("puts the spaced code in the subject and the body", () => {
    expect(spaced("482913")).toBe("482 913");
    const mail = codeEmail("482913");
    expect(mail.subject).toBe("482 913 is your Lateshow code");
    expect(mail.text).toContain("482 913");
    expect(mail.html).toContain("482 913");
  });
  it("escapes what goes into the HTML", () => {
    expect(codeEmail("<b>12").html).not.toContain("<b>12");
  });
});
