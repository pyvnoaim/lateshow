import { expect, test } from "vitest";
import { kindOf } from "./useExtension";

const mac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15";

test("a Mac WebKit browser that isn't Safari can have the extension, Safari and an iPad can't", () => {
  expect(kindOf(mac)).toBe("webkit"); // Lenira: Safari's User-Agent, no window.safari
  expect(kindOf(mac, true)).toBe("none"); // Safari
  expect(kindOf(mac, false, true)).toBe("none"); // iPad asking for the desktop site
  expect(kindOf(mac.replace("Version/27.0", "Chrome/140.0.0.0"))).toBe("chrome");
  expect(kindOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0")).toBe(
    "firefox",
  );
  expect(
    kindOf("Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"),
  ).toBe("none");
});
