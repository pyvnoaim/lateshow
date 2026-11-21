import { describe, expect, it } from "vitest";
import { blend } from "./blend";

const t = (id: number) => ({ id, media_type: "movie" });

describe("blend", () => {
  it("puts what several lists share above the top of one list", () => {
    const out = blend([
      { weight: 1, items: [t(1), t(2), t(3)] },
      { weight: 1, items: [t(4), t(5), t(3)] },
    ]);
    expect(out[0].id).toBe(3);
    expect(out).toHaveLength(5);
  });

  it("lets a loved title's list outweigh a liked one's", () => {
    expect(
      blend([
        { weight: 1, items: [t(1)] },
        { weight: 2, items: [t(2)] },
      ])[0].id,
    ).toBe(2);
  });

  it("copes with nothing", () => {
    expect(blend([])).toEqual([]);
  });
});
