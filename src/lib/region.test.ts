import { describe, expect, it } from "vitest";
import { countryFromHeaders, countryInSentence } from "./region";

const from = (headers: Record<string, string>) => countryFromHeaders((name) => headers[name]);

describe("countryFromHeaders", () => {
  it("reads Cloudflare's country header, any case", () => {
    expect(from({ "cf-ipcountry": "at" })).toBe("AT");
  });

  it("falls back to Vercel's header", () => {
    expect(from({ "x-vercel-ip-country": "CH" })).toBe("CH");
  });

  it("ignores unknown, Tor and junk values", () => {
    expect(from({ "cf-ipcountry": "XX" })).toBeNull();
    expect(from({ "cf-ipcountry": "T1" })).toBeNull();
    expect(from({ "cf-ipcountry": "germany" })).toBeNull();
    expect(from({})).toBeNull();
  });
});

describe("countryInSentence", () => {
  it("adds the article where English needs it", () => {
    expect(countryInSentence("DE")).toBe("Germany");
    expect(countryInSentence("US")).toBe("the United States");
    expect(countryInSentence("GB")).toBe("the United Kingdom");
  });
});
