import { expect, it } from "vitest";
import { earlierText } from "./earlier";

it("names the earlier episodes simply", () => {
  expect(earlierText([2])).toBe("Episode 2 too?");
  expect(earlierText([1, 2])).toBe("Episodes 1 and 2 too?");
  expect(earlierText([1, 2, 3, 4, 5, 6])).toBe("Episodes 1 to 6 too?");
  expect(earlierText([1, 3, 4, 7])).toBe("The 4 earlier episodes too?");
});
