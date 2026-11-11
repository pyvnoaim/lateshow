import "server-only";
import { cacheLife } from "next/cache";
import { serviceName, type MediaType } from "./tmdb";

// Unofficial, undocumented JustWatch endpoint. No key. Can break any time: every caller must cope with [].
const QUERY = `query Search($country: Country!, $language: Language!, $filter: TitleFilter) {
  popularTitles(country: $country, filter: $filter, first: 8, sortBy: POPULAR, sortRandomSeed: 0) {
    edges { node { objectType
      content(country: $country, language: $language) { externalIds { tmdbId } }
      offers(country: $country, platform: WEB) {
        monetizationType standardWebURL availableToTime package { packageId clearName }
      }
    } }
  }
}`;

/** `leavesAt`: when the offer ends on that service (ISO time), when JustWatch knows it. */
export type WatchLink = { service: string; url: string; included: boolean; leavesAt?: string | null };

export type Offer = {
  monetizationType: string;
  standardWebURL: string;
  availableToTime?: string | null;
  package: { packageId: number; clearName: string };
};
type Node = { objectType: string; content: { externalIds: { tmdbId: string | null } }; offers: Offer[] };

const INCLUDED = new Set(["FLATRATE", "FREE", "ADS"]);

export async function getWatchLinks(
  type: MediaType,
  tmdbId: number,
  title: string,
  country: string,
): Promise<WatchLink[]> {
  "use cache";
  cacheLife("days");
  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: QUERY,
        variables: { country, language: "en", filter: { searchQuery: title } },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const nodes: Node[] = data?.data?.popularTitles?.edges?.map((e: { node: Node }) => e.node) ?? [];
    const node = nodes.find(
      (n) => n.objectType === (type === "tv" ? "SHOW" : "MOVIE") && n.content.externalIds.tmdbId === String(tmdbId),
    );
    return node ? pickLinks(node.offers) : [];
  } catch {
    return [];
  }
}

/**
 * One link per service. A subscription offer beats rent or buy. Subscription services come first.
 * Keyed by the cleaned name: "Netflix" and "Netflix Standard with Ads" are two packages but one service to you.
 */
export function pickLinks(offers: Offer[]): WatchLink[] {
  const byService = new Map<string, WatchLink>();
  for (const o of offers) {
    const link = {
      service: serviceName(o.package.clearName),
      url: o.standardWebURL,
      included: INCLUDED.has(o.monetizationType),
      leavesAt: o.availableToTime ?? null,
    };
    const prev = byService.get(link.service);
    if (!prev || (link.included && !prev.included)) byService.set(link.service, link);
  }
  return [...byService.values()].sort((a, b) => Number(b.included) - Number(a.included));
}

const TOP_QUERY = `query Top($country: Country!, $language: Language!) {
  popularTitles(country: $country, first: 10, sortBy: POPULAR, sortRandomSeed: 0) {
    edges { node { objectType content(country: $country, language: $language) { externalIds { tmdbId } } } }
  }
}`;

/** The 10 most popular titles in the country right now (JustWatch's ranking, TMDB has none per country). [] on any failure. */
export async function getTopInCountry(country: string): Promise<{ type: MediaType; tmdbId: number }[]> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: TOP_QUERY, variables: { country, language: "en" } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const nodes: { objectType: string; content: { externalIds: { tmdbId: string | null } } }[] =
      data?.data?.popularTitles?.edges?.map((e: { node: unknown }) => e.node) ?? [];
    return nodes.flatMap((n) => {
      const id = Number(n.content.externalIds.tmdbId);
      const type = n.objectType === "SHOW" ? "tv" : n.objectType === "MOVIE" ? "movie" : null;
      return type && id ? [{ type, tmdbId: id }] : [];
    });
  } catch {
    return [];
  }
}
