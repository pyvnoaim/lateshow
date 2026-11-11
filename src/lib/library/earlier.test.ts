import { expect, it } from "vitest";
import { earlierText } from "./earlier";

it("names the earlier episodes briefly", () => {
  expect(earlierText([2])).toBe("Episode 2 too?");
  expect(earlierText([1, 2])).toBe("1 and 2 too?");
  expect(earlierText([1, 2, 3, 4, 5, 6])).toBe("1 to 6 too?");
  expect(earlierText([1, 3, 4, 7])).toBe("4 earlier too?");
});
