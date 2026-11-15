import { describe, expect, it } from "vitest";
import { browserName } from "./browser";

describe("browserName", () => {
  it("names the browser and system from a User-Agent", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)";
    expect(browserName(`${mac} Chrome/142.0.0.0 Safari/537.36`)).toBe("Chrome on macOS");
    expect(browserName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:159.0) Gecko/20100101 Firefox/159.0")).toBe(
      "Firefox on macOS",
    );
    expect(browserName(`${mac} Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0`)).toBe("Edge on macOS");
    expect(browserName("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")).toBe(
      "Firefox on Windows",
    );
    expect(browserName(`${mac} Version/18.0 Safari/605.1.15`)).toBe("Safari on macOS");
    expect(browserName("curl/8.0")).toBeNull();
    expect(browserName(null)).toBeNull();
  });
});
