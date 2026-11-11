import { describe, expect, it } from "vitest";
import { passkeyLabel } from "./passkeyLabel";

const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";

describe("passkeyLabel", () => {
  it("says Touch ID on a Mac", () => {
    expect(passkeyLabel(MAC, 0)).toBe("Touch ID");
  });
  it("says Face ID on iPhone, and on an iPad that presents itself as a Mac", () => {
    expect(passkeyLabel(IPHONE, 5)).toBe("Face ID");
    expect(passkeyLabel(MAC, 5)).toBe("Face ID");
  });
  it("stays generic elsewhere", () => {
    expect(passkeyLabel(WINDOWS, 0)).toBe("your passkey");
  });
});
