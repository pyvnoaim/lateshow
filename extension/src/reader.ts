// What every site's history reader shares: one read at a time, the result kept in storage (so closing the card or a
// reload loses nothing) until Lateshow has it, and how a site's own page is asked for data with your sign-in there.
import type { ImportRow } from "@/lib/library/importing";

/** `step`: a later step of the read in words (Netflix checking what you finished), shown instead of the pages */
export type Progress = { pages: number; titles: number; oldest: string; at: number; step?: string };
export type Found = { rows: ImportRow[]; skipped: number; oldest: string; newest: number };
export type ReadHistory = (onProgress: (p: Progress) => void, since: number) => Promise<Found>;

/** A site's read for the card: `since` is the last import's newest watch (Read new), 0 for everything */
export function reader(source: string, readHistory: ReadHistory) {
  let running: Promise<{ rows: ImportRow[]; oldest: string }> | null = null;
  return (onProgress: (p: Progress) => void, since: number) =>
    (running ??= (async () => {
      try {
        const { rows, skipped, oldest, newest } = await readHistory(onProgress, since);
        await chrome.storage.local.set({ pending: { source, rows, skipped, oldest, newest, at: Date.now() } });
        return { rows, oldest };
      } finally {
        running = null;
      }
    })());
}

// Firefox makes a content script's requests as the extension, `content.fetch` as the page (with its sign-in)
export const pageFetch: typeof fetch = (() => {
  const content = (globalThis as { content?: { fetch: typeof fetch } }).content;
  return content ? content.fetch.bind(content) : fetch.bind(globalThis);
})();

/** JSON from the site, or an error that says what came back (so a changed site shows up as something to fix) */
export async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await pageFetch(url, { credentials: "include", headers: { accept: "application/json", ...headers } });
  const text = await res.text();
  try {
    if (!res.ok) throw new Error();
    return JSON.parse(text) as unknown;
  } catch {
    const type = res.headers.get("content-type") ?? "no type";
    throw new Error(`The site answered ${res.status} (${type}) instead of data: ${text.slice(0, 60)}`);
  }
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Whether this page was opened by a sync from the popup (background.ts knows its tab), and from when to read */
export async function syncJob(): Promise<{ since: number } | null> {
  try {
    return await chrome.runtime.sendMessage<{ since: number } | null>({ type: "lateshow:sync-job" });
  } catch {
    return null;
  }
}

/**
 * A sync's read: no card, the rows go to background.ts, which imports them. A page that isn't ready yet (Crunchyroll's
 * app hasn't asked its API, Netflix's profile isn't there) gets two more tries a few seconds apart.
 */
export async function autoRead(readHistory: ReadHistory, since: number) {
  const send = (m: { type: string; [key: string]: unknown }) => chrome.runtime.sendMessage(m).catch(() => null);
  for (let attempt = 1; ; attempt++) {
    try {
      const found = await readHistory((p) => void send({ type: "lateshow:sync-progress", titles: p.titles }), since);
      await send({ type: "lateshow:sync-rows", rows: found.rows, skipped: found.skipped, newest: found.newest });
      return;
    } catch (e) {
      if (attempt >= 3) return void send({ type: "lateshow:sync-error", message: (e as Error).message });
      await pause(4000);
    }
  }
}

/** A history page: a sync's read when the popup opened it, else the card */
export function historyPage(source: string, readHistory: ReadHistory, card: () => void) {
  void syncJob().then((job) => (job ? autoRead(readHistory, job.since) : card()));
}
