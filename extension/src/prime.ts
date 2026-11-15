// Runs on primevideo.com. On request from the popup it reads your watch history from Prime Video's own data (the
// page's watch-history widget, then its paging API with your Prime sign-in), turns it into Lateshow import rows and
// keeps them in the extension's storage for the Lateshow tab. Read only: Prime's remove action is never called.
import { readPrimeHistory, type ImportRow, type PrimeTitle } from "@/lib/library/importing";
import { showCard } from "./card";

type Day = { date?: string; titles?: PrimeTitle[] };
type Widget = { widgetType?: string; content?: { content?: { titles?: Day[]; nextToken?: string } } };

const PAGE = "/api/getWatchHistorySettingsPage";

// Firefox makes a content script's requests as the extension, `content.fetch` as the page (with its sign-in)
const pageFetch: typeof fetch = (() => {
  const content = (globalThis as { content?: { fetch: typeof fetch } }).content;
  return content ? content.fetch.bind(content) : fetch.bind(globalThis);
})();

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

async function getJson(url: string) {
  // like Prime's own page asks: without these it may answer with an HTML page
  const res = await pageFetch(url, {
    credentials: "include",
    headers: { accept: "application/json", "x-requested-with": "XMLHttpRequest" },
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // say what came back, so a changed Prime shows up as something to fix
    const type = res.headers.get("content-type") ?? "no type";
    throw new Error(`Prime Video answered ${res.status} (${type}) instead of data: ${text.slice(0, 60)}`);
  }
}

export type Progress = { pages: number; titles: number; oldest: string; at: number };

async function readHistory(onProgress: (p: Progress) => void = () => {}) {
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
  widget ??= findWidget(await getJson(PAGE));
  if (!widget) throw new Error("No watch history found here. Open your Prime Video watch history and try again.");
  const days = [...(widget.content?.content?.titles ?? [])];
  let token = widget.content?.content?.nextToken;
  // how far back it got (Prime doesn't say how much there is in all): for the card here and the popup
  const report = async (pages: number) => {
    const progress = {
      pages,
      titles: days.reduce((n, d) => n + (d.titles?.length ?? 0), 0),
      oldest: days.at(-1)?.date ?? "",
      at: Date.now(),
    };
    onProgress(progress);
    await chrome.storage.local.set({ progress });
  };
  await report(1);
  // ponytail: 500 pages cap (a page is a few days), so a loop in Prime's paging can't run forever
  for (let page = 1; token && page < 500; page++) {
    await new Promise((r) => setTimeout(r, 250)); // gently, one page at a time
    const next = findWidget(
      await getJson(`${PAGE}?widgetArgs=${encodeURIComponent(JSON.stringify({ nextToken: token }))}`),
    );
    days.push(...(next?.content?.content?.titles ?? []));
    token = next?.content?.content?.nextToken;
    await report(page + 1);
  }
  return { ...readPrimeHistory(days), oldest: days.at(-1)?.date ?? "" };
}

type ReadResult = { rows: ImportRow[]; oldest: string };
let running: Promise<ReadResult> | null = null;

/** One read at a time (the card and the popup may both ask), kept in storage when done so nothing is lost. */
function read(onProgress?: (p: Progress) => void): Promise<ReadResult> {
  running ??= (async () => {
    try {
      const { rows, skipped, oldest } = await readHistory(onProgress);
      await chrome.storage.local.set({ pending: { source: "Prime Video", rows, skipped, oldest, at: Date.now() } });
      return { rows, oldest };
    } finally {
      running = null;
      await chrome.storage.local.remove("progress");
    }
  })();
  return running;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "lateshow:read-prime") return;
  read()
    .then(() => sendResponse({ ok: true }))
    .catch((e: unknown) => sendResponse({ error: e instanceof Error ? e.message : String(e) }));
  return true; // answers later
});

if (location.pathname.startsWith("/settings/watch-history")) showCard(read);
