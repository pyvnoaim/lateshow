// Runs on Lateshow's Settings page. Opened by the popup with ?import=extension, it hands the rows the extension read
// to the page's import (ImportHistory), once: the page says it's ready, this script posts the rows and forgets them.
import type { ImportRow } from "@/lib/library/importing";

type Pending = { source: string; rows: ImportRow[]; skipped: number };

if (new URLSearchParams(location.search).get("import") === "extension") {
  void chrome.storage.local.get("pending").then(({ pending }) => {
    const p = pending as Pending | undefined;
    if (!p?.rows?.length) return;
    let sent = false;
    window.addEventListener("message", (e) => {
      if (sent || e.source !== window || (e.data as { type?: string })?.type !== "lateshow:import-ready") return;
      sent = true;
      window.postMessage({ type: "lateshow:import-rows", rows: p.rows, skipped: p.skipped }, location.origin);
      void chrome.storage.local.remove("pending");
    });
    // the page may have said ready before this script ran: say hello, it answers
    window.postMessage({ type: "lateshow:import-hello" }, location.origin);
  });
}
