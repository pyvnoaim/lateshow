import { cacheLife } from "next/cache";
import { COUNTRY, type MediaType } from "./tmdb";

// Unofficial, undocumented JustWatch endpoint. No key. Can break any time: every caller must cope with [].
const QUERY = `query Search($country: Country!, $language: Language!, $filter: TitleFilter) {
  popularTitles(country: $country, filter: $filter, first: 8, sortBy: POPULAR, sortRandomSeed: 0) {
    edges { node { objectType
      content(country: $country, language: $language) { externalIds { tmdbId } }
      offers(country: $country, platform: WEB) {
        monetizationType standardWebURL package { packageId clearName }
      }
    } }
  }
}`;

export type WatchLink = { service: string; url: string; included: boolean };

type Offer = { monetizationType: string; standardWebURL: string; package: { packageId: number; clearName: string } };
type Node = { objectType: string; content: { externalIds: { tmdbId: string | null } }; offers: Offer[] };

const INCLUDED = new Set(["FLATRATE", "FREE", "ADS"]);

export async function getWatchLinks(type: MediaType, tmdbId: number, title: string): Promise<WatchLink[]> {
  "use cache";
  cacheLife("days");
  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { country: COUNTRY, language: "en", filter: { searchQuery: title } } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const nodes: Node[] = data?.data?.popularTitles?.edges?.map((e: { node: Node }) => e.node) ?? [];
    const node = nodes.find(
      (n) => n.objectType === (type === "tv" ? "SHOW" : "MOVIE") && n.content.externalIds.tmdbId === String(tmdbId),
    );
    if (!node) return [];
    // One link per service, included-with-subscription offers win over rent/buy.
    const byService = new Map<number, WatchLink>();
    for (const o of node.offers) {
      const link = { service: o.package.clearName, url: o.standardWebURL, included: INCLUDED.has(o.monetizationType) };
      const prev = byService.get(o.package.packageId);
      if (!prev || (link.included && !prev.included)) byService.set(o.package.packageId, link);
    }
    return [...byService.values()].sort((a, b) => Number(b.included) - Number(a.included));
  } catch {
    return [];
  }
}
