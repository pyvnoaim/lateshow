// Runs on Lateshow. Once the address is /settings?import=extension (opened by the popup, maybe after signing in, which
// gets there by moving inside the app, no new page load) it hands the rows the extension read to the page's import
// (ImportHistory), once: the page says it's ready, this script posts the rows and forgets them.
import type { ImportRow } from "@/lib/library/importing";

type Pending = { source: string; rows: ImportRow[]; skipped: number };

const wanted = () =>
  location.pathname === "/settings" && new URLSearchParams(location.search).get("import") === "extension";

let started = false;

async function handOver() {
  started = true;
  const p = (await chrome.storage.local.get("pending")).pending as Pending | undefined;
  if (!p?.rows?.length) return;
  let sent = false;
  window.addEventListener("message", (e) => {
    if (sent || e.source !== window || (e.data as { type?: string })?.type !== "lateshow:import-ready") return;
    sent = true;
    window.postMessage({ type: "lateshow:import-rows", rows: p.rows, skipped: p.skipped }, location.origin);
    void chrome.storage.local.remove("pending");
  });
  // the page may have said ready before this script listened, or mounts later: say hello until it answers
  const hello = setInterval(() => {
    if (sent) clearInterval(hello);
    else window.postMessage({ type: "lateshow:import-hello" }, location.origin);
  }, 500);
  setTimeout(() => clearInterval(hello), 60_000);
}

// ponytail: a cheap address check twice a second, a content script can't see the app's own navigation
const check = () => !started && wanted() && void handOver();
check();
setInterval(check, 500);
