import { describe, expect, it } from "vitest";
import { pool } from "./pool";

describe("pool", () => {
  it("keeps input order and never runs more than n at once", async () => {
    let running = 0;
    let most = 0;
    const out = await pool([5, 1, 4, 2, 3], 2, async (n) => {
      most = Math.max(most, ++running);
      await new Promise((r) => setTimeout(r, n));
      running--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30]);
    expect(most).toBe(2);
  });
});
