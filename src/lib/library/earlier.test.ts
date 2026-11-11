import { expect, it } from "vitest";
import { earlierText } from "./earlier";

it("asks plainly about the earlier episodes", () => {
  expect(earlierText([2])).toBe("Watched episode 2 too?");
  expect(earlierText([1, 2])).toBe("Watched episodes 1 and 2 too?");
  expect(earlierText(Array.from({ length: 60 }, (_, i) => i + 1))).toBe("Watched episodes 1 to 60 too?");
  expect(earlierText([1, 3, 4, 7])).toBe("Watched the 4 before it too?");
});
