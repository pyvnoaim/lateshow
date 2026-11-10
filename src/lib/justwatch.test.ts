import { describe, expect, it } from "vitest";
import { pickLinks, type Offer } from "./justwatch";

const offer = (packageId: number, name: string, type: string): Offer => ({
  monetizationType: type,
  standardWebURL: `https://example.com/${name}/${type}`,
  package: { packageId, clearName: name },
});

describe("pickLinks", () => {
  it("keeps one link per service and prefers the subscription offer", () => {
    const links = pickLinks([offer(1, "Prime", "RENT"), offer(1, "Prime", "FLATRATE"), offer(1, "Prime", "BUY")]);
    expect(links).toEqual([{ service: "Prime", url: "https://example.com/Prime/FLATRATE", included: true }]);
  });

  it("lists subscription services before rent or buy", () => {
    const links = pickLinks([offer(2, "Apple", "BUY"), offer(3, "Netflix", "FLATRATE")]);
    expect(links.map((l) => l.service)).toEqual(["Netflix", "Apple"]);
  });
});
