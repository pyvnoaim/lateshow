// Runs on primevideo.com. On the watch history page its card reads your history from Prime Video's own data (the
// page's watch-history widget, then its paging API with your Prime sign-in) into Lateshow import rows. Read only:
// Prime's remove action is never called.
import { primeSince, readPrimeHistory, type PrimeTitle } from "@/lib/library/importing";
import { showCard } from "./card";
import { getJson, pause, reader, type ReadHistory } from "./reader";

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
const readHistory: ReadHistory = async (onProgress, since) => {
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
  const kept = since ? primeSince(days, since) : days;
  return { ...readPrimeHistory(kept), oldest: kept.at(-1)?.date ?? "", newest: newestIn(days) };
};

const SOURCE = "Prime Video";
if (location.pathname.startsWith("/settings/watch-history")) showCard(SOURCE, reader(SOURCE, readHistory));
