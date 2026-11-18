// Runs on primevideo.com. On the watch history page its card reads your history from Prime Video's own data (the
// page's watch-history widget, then its paging API with your Prime sign-in) into Lateshow import rows. In the player
// it marks what you finish (watch.ts), with what prime-main.ts notes from the player's own answers. Read only:
// Prime's remove action is never called.
import {
  primeProgress,
  primeSince,
  primeTitle,
  readPrimeHistory,
  readPrimeWatchlist,
  type ImportRow,
  type PrimeTitle,
  type PrimeWatchlistCard,
} from "@/lib/library/importing";
import { showCard } from "./card";
import { getJson, historyPage, pageFetch, pause, reader, type ReadHistory } from "./reader";
import { watch, type Clock } from "./watch";

type Day = { date?: string; titles?: PrimeTitle[] };
type Widget = { widgetType?: string; content?: { content?: { titles?: Day[]; nextToken?: string } } };

const PAGE = "/api/getWatchHistorySettingsPage";
// like Prime's own page asks: without these it may answer with an HTML page
const HEADERS = { "x-requested-with": "XMLHttpRequest" };

/** The watch-history widget somewhere inside Prime's data (its place moves: props.widgets, init.preparations…). */
function findWidget(o: unknown, seen = new Set<object>()): Widget | null {
  if (!o || typeof o !== "object" || seen.has(o)) return null;
  seen.add(o);
  if ((o as Widget).widgetType === "watch-history") return o as Widget;
  for (const v of Object.values(o)) {
    const hit = findWidget(v, seen);
    if (hit) return hit;
  }
  return null;
}

/** The latest watch time in these days (ms), 0 for none */
const newestIn = (days: Day[]) =>
  Math.max(
    0,
    ...days.flatMap((d) =>
      (d.titles ?? []).flatMap((t) => [t.time ?? 0, ...(t.children ?? []).map((e) => e.time ?? 0)]),
    ),
  );

/** `since` (ms): only what came after it ("Read new"), paging stops once a day is older */
const readHistory: ReadHistory = async (onProgress, since, opts) => {
  let widget: Widget | null = null;
  for (const s of document.querySelectorAll('script[type="application/json"], script[type="text/template"]')) {
    try {
      widget = findWidget(JSON.parse(s.textContent ?? ""));
    } catch {
      continue;
    }
    if (widget) break;
  }
  // not embedded in this page: ask for the first page
  widget ??= findWidget(await getJson(PAGE, HEADERS));
  if (!widget) throw new Error("No watch history found here. Open your Prime Video watch history and try again.");
  const days = [...(widget.content?.content?.titles ?? [])];
  let token = widget.content?.content?.nextToken;
  // how far back it got (Prime doesn't say how much there is in all)
  const report = (pages: number) =>
    onProgress({
      pages,
      titles: days.reduce((n, d) => n + (d.titles?.length ?? 0), 0),
      oldest: days.at(-1)?.date ?? "",
      at: Date.now(),
    });
  report(1);
  // ponytail: 500 pages cap (a page is a few days), so a loop in Prime's paging can't run forever
  // "Read new": a page that reaches back past the last import is the last one needed
  const pastLast = () => since > 0 && newestIn(days.slice(-1)) <= since;
  for (let page = 1; token && page < 500 && !pastLast(); page++) {
    await pause(250); // gently, one page at a time
    const next = findWidget(
      await getJson(`${PAGE}?widgetArgs=${encodeURIComponent(JSON.stringify({ nextToken: token }))}`, HEADERS),
    );
    days.push(...(next?.content?.content?.titles ?? []));
    token = next?.content?.content?.nextToken;
    report(page + 1);
  }
  let kept = since ? primeSince(days, since) : days;
  // what's new since the last sync: Prime lists every episode you start, its season pages say which you finished.
  // A first read of everything skips this (hundreds of pages, and nothing in it can be a rewatch yet)
  const finished = new Set<string>();
  if (since) {
    const { done, started } = await seasonProgress(kept, (n, all) =>
      onProgress({
        pages: 0,
        titles: kept.reduce((k, d) => k + (d.titles?.length ?? 0), 0),
        oldest: "",
        at: Date.now(),
        step: `Checking what you finished · ${n} of ${all}`,
      }),
    );
    for (const gti of done) finished.add(gti);
    kept = kept
      .map((d) => ({
        ...d,
        titles: (d.titles ?? []).flatMap((t) => {
          if (!t.children?.length) return [t];
          const children = t.children.filter((e) => !e.gti || !started.has(e.gti));
          return children.length ? [{ ...t, children }] : [];
        }),
      }))
      .filter((d) => d.titles.length);
  }
  const read = readPrimeHistory(kept, finished);
  // the watchlist along (a sync with the popup's switch on), best effort
  if (opts?.watchlist) read.rows.push(...readPrimeWatchlist(await watchlist().catch(() => [])));
  return { ...read, oldest: kept.at(-1)?.date ?? "", newest: newestIn(days), profile: activeProfile() };
};

/**
 * Each season's page in these days, once, read for what it says you finished (`primeProgress`). Best effort: a page
 * that doesn't load says nothing, so its episodes come in as before (never as rewatches).
 * ponytail: 40 seasons at most per sync (a page is about 1 MB). A sync reads days, not months, so it's never near that.
 */
async function seasonProgress(days: Day[], onProgress: (n: number, all: number) => void) {
  const seasons = new Map<string, string[]>();
  for (const t of days.flatMap((d) => d.titles ?? []))
    if (t.children?.length && t.title?.href) {
      const href = t.title.href.split("?")[0];
      seasons.set(href, [...(seasons.get(href) ?? []), ...t.children.flatMap((e) => (e.gti ? [e.gti] : []))]);
    }
  const pages = [...seasons].slice(0, 40);
  const done = new Set<string>();
  const started = new Set<string>();
  for (const [i, [href, gtis]] of pages.entries()) {
    onProgress(i + 1, pages.length);
    try {
      const html = await (await pageFetch(href, { credentials: "include" })).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const data = [...doc.querySelectorAll('script[type="application/json"], script[type="text/template"]')].flatMap(
        (s) => {
          try {
            return [JSON.parse(s.textContent ?? "") as unknown];
          } catch {
            return [];
          }
        },
      );
      const p = primeProgress(data, gtis);
      for (const g of p.done) done.add(g);
      for (const g of p.started) started.add(g);
    } catch {
      // unread: these episodes stay as the history has them
    }
    await pause(250);
  }
  return { done, started };
}

// The watchlist as its page asks for it: the list as data, then /api/paginateCollection with the page container's
// token for the rest (the fixed fields are the page's own, 2026-11-16)
const FIXED: [string, string][] = [
  ["pageType", "home"],
  ["pageId", "Watchlist"],
  ["collectionType", "Container"],
  ["actionScheme", "default"],
  ["payloadScheme", "default"],
  ["decorationScheme", "web-decoration-gti-v4"],
  ["featureScheme", "web-features-v6"],
  ...[
    "integration",
    "CLIENT_DECORATION_ENABLE_DAAPI",
    "ENABLE_DRAPER_CONTENT",
    "HorizontalPagination",
    "CleanSlate",
    "EpgContainerPagination",
    "ENABLE_GPCI",
    "SupportsImageTextLinkTextInStandardHero",
    "Remaster",
    "SupportsChannelWidget",
    "PromotionalBannerSupported",
    "RemoveFromContinueWatching",
    "SearchChannelBundles",
    "LinearStationInAllCarousels",
    "SupportChannelItemDecoration",
    "TvodMovieBundles",
    "LinearFavoritesSupported",
    "RecordingCardSupported",
  ].map((f): [string, string] => ["dynamicFeatures", f]),
  ["widgetScheme", "web-explore-v49"],
  ["variant", "desktopOSX"],
  ["myStuffViewType", "watchlist"],
  ["journeyIngressContext", ""],
];
type Container = { paginationServiceToken?: string; paginationTargetId?: string; paginationStartIndex?: number };
function scan(o: unknown, cards: PrimeWatchlistCard[], containers: Container[], seen = new Set<object>()) {
  if (!o || typeof o !== "object" || seen.has(o)) return;
  seen.add(o);
  if ((o as { widgetType?: string }).widgetType === "TitleCard") cards.push(o as PrimeWatchlistCard);
  if ((o as Container).paginationServiceToken) containers.push(o as Container);
  for (const v of Object.values(o)) scan(v, cards, containers, seen);
}
async function watchlist(): Promise<PrimeWatchlistCard[]> {
  const cards: PrimeWatchlistCard[] = [];
  let containers: Container[] = [];
  scan(await getJson("/mystuff/watchlist/all/", HEADERS), cards, containers);
  // ponytail: 50 pages (20 each), past what a watchlist holds
  for (let page = 0, c = containers[0]; c?.paginationServiceToken && page < 50; page++) {
    const res = await pageFetch("/api/paginateCollection", {
      method: "POST",
      credentials: "include",
      headers: { ...HEADERS, accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams([
        ...FIXED,
        ["paginationTargetId", c.paginationTargetId ?? ""],
        ["serviceToken", c.paginationServiceToken],
        ["startIndex", String(c.paginationStartIndex ?? cards.length)],
      ]),
    });
    if (!res.ok) break;
    const more: PrimeWatchlistCard[] = [];
    containers = [];
    scan(await res.json(), more, containers);
    if (!more.length) break;
    cards.push(...more);
    c = containers[0];
  }
  return cards;
}

const SOURCE = "Prime Video";
// the address may carry a language (/-/de/settings/…)
if (location.pathname.includes("/settings/watch-history"))
  historyPage(SOURCE, readHistory, () => showCard(SOURCE, reader(SOURCE, readHistory)));

// --- marking what you finish

type Catalog = {
  catalogType?: string; // "EPISODE", "MOVIE"
  title?: string;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};
// what prime-main.ts noted, per title id: its own length and credits point, and what it is
const lengths = new Map<string, { durationMs?: number; nextUpMs?: number }>();
const catalogs = new Map<string, Catalog>();
let current = ""; // the title the player shows (its catalog is asked for the player only)
window.addEventListener("message", (e) => {
  const d = e.data as
    ({ type?: string; kind?: string; titleId?: string } & Catalog & { durationMs?: number; nextUpMs?: number }) | null;
  if (e.source !== window || d?.type !== "lateshow:pv" || !d.titleId) return;
  if (d.kind === "title") lengths.set(d.titleId, { durationMs: d.durationMs, nextUpMs: d.nextUpMs });
  if (d.kind === "catalog") {
    catalogs.set(d.titleId, d);
    current = d.titleId;
  }
});

const ad = () => Boolean(document.querySelector(".atvwebplayersdk-ad-timer-remaining-time"));

// Prime stitches ad breaks into the episode's own video, so its time runs ahead of the episode's by the ads played
// so far: those seconds are taken off. ponytail: an ad break skipped by seeking past it isn't known, Prime plays them
let shift = 0;
let last: { id: string; at: number } | null = null;
let episodeAt = -1; // the episode's own position at the last reading
function clock(): Clock | null {
  let v: HTMLVideoElement | null = null;
  for (const x of document.querySelectorAll<HTMLVideoElement>(".atvwebplayersdk-video-surface video"))
    if (x.duration > 0 && (!v || x.clientHeight > v.clientHeight)) v = x;
  const length = lengths.get(current);
  if (!v || !current || !length?.durationMs) return null;
  if (last?.id !== current) shift = 0; // the next episode
  const step = last ? v.currentTime - last.at : 0;
  if (ad() && step > 0 && step < 5) shift += step;
  last = { id: current, at: v.currentTime };
  episodeAt = Math.max(0, v.currentTime - shift);
  return { at: episodeAt, duration: length.durationMs / 1000, rate: v.playbackRate, paused: v.paused };
}

function playing(): ImportRow | null {
  const c = catalogs.get(current);
  if (!c?.title) return null;
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (c.catalogType === "MOVIE") {
    const { title, year } = primeTitle(c.title);
    return { title, year, type: "movie", list: "watched", date };
  }
  if (!c.seriesTitle) return null;
  return {
    title: primeTitle(c.seriesTitle).title,
    type: "tv",
    list: "watched",
    date,
    episodes: [{ season: c.seasonNumber, episode: c.episodeNumber, name: c.title, date }],
  };
}

/** Your active Prime profile's name from the page's own data (a profile switch reloads the page) */
function activeProfile(): string | null {
  const find = (o: unknown, seen: Set<object>): string | null => {
    if (!o || typeof o !== "object" || seen.has(o)) return null;
    seen.add(o);
    const p = (o as { activeProfile?: { name?: string } }).activeProfile;
    if (typeof p?.name === "string") return p.name;
    for (const v of Object.values(o)) {
      const hit = find(v, seen);
      if (hit) return hit;
    }
    return null;
  };
  for (const s of document.querySelectorAll('script[type="application/json"]')) {
    try {
      const hit = find(JSON.parse(s.textContent ?? ""), new Set());
      if (hit) return hit;
    } catch {
      continue;
    }
  }
  return null;
}
let profile: string | null | undefined;

watch({
  via: SOURCE,
  playing,
  clock,
  ad,
  // only your profile is marked (the first that finishes something here, changeable in the popup)
  profile: () => (profile ??= activeProfile()),
  // Prime's own "next up" point (where the credits start)
  credits: () => {
    const next = lengths.get(current)?.nextUpMs;
    return Boolean(next && episodeAt >= next / 1000);
  },
});
