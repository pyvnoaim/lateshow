// Runs on netflix.com. On your viewing activity its card reads your history from Netflix's own API (the call the
// page's Show more makes, with your Netflix sign-in, for the profile you're on) into Lateshow import rows
// (readNetflixHistory, tested). Read only on Netflix's side.
import { readNetflixHistory, type NetflixViewed } from "@/lib/library/importing";
import { showCard } from "./card";
import { pageFetch, pause, reader, type ReadHistory } from "./reader";

type Ids = { guid: string | null; build: string | null };
type Answer = {
  jsonGraph?: { aui?: { viewingActivity?: { value?: { vhSize?: number; viewedItems?: NetflixViewed[] } } } };
};

/** The profile and build ids from the page script (netflix-main.ts) */
function ask(): Promise<Ids> {
  return new Promise((resolve) => {
    const answer = (e: MessageEvent) => {
      const d = e.data as ({ type?: string } & Ids) | null;
      if (e.source !== window || d?.type !== "lateshow:nf-ids") return;
      window.removeEventListener("message", answer);
      resolve(d);
    };
    window.addEventListener("message", answer);
    window.postMessage({ type: "lateshow:nf-ask" }, location.origin);
    setTimeout(() => {
      window.removeEventListener("message", answer);
      resolve({ guid: null, build: null });
    }, 1500);
  });
}

const PAGE = 50; // what the page itself asks for

/** One page of your viewing activity, newest first. Without Netflix's routing headers its edge answers BLOCKED. */
async function page(n: number, { guid, build }: Ids) {
  const path = encodeURIComponent(JSON.stringify(["aui", "viewingActivity", n, PAGE]));
  const res = await pageFetch(`/api/aui/pathEvaluator/web/%5E2.0.0?method=call&callPath=${path}&falcor_server=0.1.0`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-netflix.request.routing": JSON.stringify({
        path: "/nq/aui/endpoint/%5E1.0.0-web/pathEvaluator",
        control_tag: "auinqweb",
      }),
      "x-netflix.nq.stack": "prod",
      "x-netflix.uiversion": build ?? "",
      "x-netflix.clienttype": "akira",
      "x-netflix.client.request.name": "ui/xhrUnclassified",
    },
    body: "param=" + encodeURIComponent(JSON.stringify({ guid })),
  });
  const text = await res.text();
  try {
    if (!res.ok) throw new Error();
    return (JSON.parse(text) as Answer).jsonGraph?.aui?.viewingActivity?.value ?? {};
  } catch {
    throw new Error(`Netflix answered ${res.status} instead of data: ${text.slice(0, 60)}`);
  }
}

const shortDay = (ms?: number) =>
  ms ? new Date(ms).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "";

const readHistory: ReadHistory = async (onProgress, since) => {
  const ids = await ask();
  if (!ids.guid) throw new Error("Netflix didn't say which profile this is. Reload this page, then try again.");
  const items: NetflixViewed[] = [];
  // ponytail: 400 pages cap (50 each), so a loop in Netflix's paging can't run forever
  for (let n = 0; n < 400; n++) {
    const { vhSize, viewedItems = [] } = await page(n, ids);
    items.push(...viewedItems);
    onProgress({ pages: n + 1, titles: items.length, oldest: shortDay(items.at(-1)?.date), at: Date.now() });
    if (!viewedItems.length || items.length >= (vhSize ?? Infinity)) break;
    // "Read new": a page that reaches back past the last import is the last one needed
    if (since && (items.at(-1)?.date ?? 0) <= since) break;
    await pause(250); // gently, one page at a time
  }
  const kept = since ? items.filter((v) => (v.date ?? 0) > since) : items;
  const newest = Math.max(0, ...items.map((v) => v.date ?? 0));
  return { ...readNetflixHistory(kept), oldest: shortDay(kept.at(-1)?.date), newest };
};

const SOURCE = "Netflix";
if (/\/(settings\/viewed|viewingactivity)/.test(location.pathname)) showCard(SOURCE, reader(SOURCE, readHistory));
