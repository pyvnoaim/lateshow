// Runs on Lateshow. Once the address is /settings?import=extension (opened by the popup, maybe after signing in, which
// gets there by moving inside the app, no new page load) it hands the rows the extension read to the page's import
// (ImportHistory): the page says it's ready, this script posts the rows, the page says it has them, then they're forgotten.
import type { ImportRow } from "@/lib/library/importing";

type Pending = { source: string; rows: ImportRow[]; skipped: number; newest?: number };

const wanted = () =>
  location.pathname === "/settings" && new URLSearchParams(location.search).get("import") === "extension";

let started = false;

// a few console lines, so a handoff that doesn't happen says where it stopped
const log = (...args: unknown[]) => console.info("[Lateshow]", ...args);

async function handOver() {
  started = true;
  const p = (await chrome.storage.local.get("pending")).pending as Pending | undefined;
  const count = p?.rows?.length ?? 0;
  log(count ? `${count} rows from ${p!.source} to hand over` : "nothing to hand over");
  let sent = false;
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const type = (e.data as { type?: string })?.type;
    if (type === "lateshow:import-ready" && count && !sent) {
      sent = true;
      log("the page is ready, handing over");
      window.postMessage(
        { type: "lateshow:import-rows", rows: p!.rows, skipped: p!.skipped, source: p!.source },
        location.origin,
      );
    }
    // only once the page has them: a handoff that fails keeps the rows for the next try
    if (type === "lateshow:import-received") {
      log("the page has them");
      void chrome.storage.local.remove("pending");
      // how far this import reached: the next "Read new" starts after it
      if (p?.newest)
        void chrome.storage.local.get("synced").then(({ synced }) => {
          const s = (synced as Record<string, number> | undefined) ?? {};
          return chrome.storage.local.set({ synced: { ...s, [p.source]: Math.max(s[p.source] ?? 0, p.newest!) } });
        });
    }
  });
  // the page may have said ready before this script listened, or mounts later: say hello (with how many) until it
  // answers. With none it tells you to read the site again.
  const hello = setInterval(() => {
    if (sent) clearInterval(hello);
    else window.postMessage({ type: "lateshow:import-hello", count }, location.origin);
  }, 500);
  setTimeout(() => clearInterval(hello), 60_000);
}

// Connecting (Settings › Extension, opened by the popup with ?connect=extension): the page hands over the new key once
// you clicked Connect there, this script keeps it and says so. Only this window's own message, only on that page.
window.addEventListener("message", (e) => {
  const d = e.data as { type?: string; key?: unknown } | null;
  if (e.source !== window || d?.type !== "lateshow:extension-key" || typeof d.key !== "string") return;
  if (location.pathname !== "/settings" || new URLSearchParams(location.search).get("connect") !== "extension") return;
  void chrome.storage.local.set({ key: d.key }).then(() => {
    log("connected");
    window.postMessage({ type: "lateshow:extension-connected" }, location.origin);
  });
});

// ponytail: a cheap address check twice a second, a content script can't see the app's own navigation
const check = () => !started && wanted() && void handOver();
check();
setInterval(check, 500);
