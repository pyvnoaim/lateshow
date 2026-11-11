import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LANGUAGE_COOKIE, pickLanguage } from "./languages";

export const DEFAULT_COUNTRY = "DE";

// Geo headers set by the CDN in front of the app. Cloudflare first (our setup), Vercel as a fallback.
const GEO_HEADERS = ["cf-ipcountry", "x-vercel-ip-country"];

/**
 * The visitor's country (ISO 3166 code) from a geo header, or null.
 * Ignores Cloudflare's "XX" (unknown) and "T1" (Tor). Pure, so it's testable without a request.
 */
export function countryFromHeaders(get: (name: string) => string | null | undefined) {
  for (const name of GEO_HEADERS) {
    const value = get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1") return value;
  }
  return null;
}

/** Country for this request, signed in or not. Germany when there's no geo header (local dev). Nothing is stored. */
export const getCountry = cache(async () => {
  const h = await headers();
  return countryFromHeaders((name) => h.get(name)) ?? DEFAULT_COUNTRY;
});

const names = new Intl.DisplayNames(["en"], { type: "region" });

// Country names that read with "the" in a sentence ("in the United States").
const WITH_THE = new Set([
  "US",
  "GB",
  "NL",
  "AE",
  "PH",
  "DO",
  "BS",
  "GM",
  "CD",
  "CG",
  "CF",
  "VA",
  "MV",
  "SC",
  "KM",
  "MH",
  "SB",
  "KY",
  "VG",
  "VI",
  "FO",
  "BQ",
  "MP",
]);

/** Country name for use inside a sentence: "Germany", "the United States". */
export function countryInSentence(code: string) {
  const name = names.of(code) ?? code;
  return WITH_THE.has(code) ? `the ${name}` : name;
}

/** Language for TMDB data: your choice in Settings, else your browser's. */
export const getLanguage = cache(async () => {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLanguage(c.get(LANGUAGE_COOKIE)?.value, h.get("accept-language"));
});

/** Country and language for this request: { code: "DE", name: "Germany", lang: "de-DE" } */
export async function getRegion() {
  const [code, lang] = await Promise.all([getCountry(), getLanguage()]);
  return { code, name: countryInSentence(code), lang };
}
