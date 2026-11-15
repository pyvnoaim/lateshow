// What every site's history reader shares: one read at a time, the result kept in storage (so closing the card or a
// reload loses nothing) until Lateshow has it, and how a site's own page is asked for data with your sign-in there.
import type { ImportRow } from "@/lib/library/importing";

export type Progress = { pages: number; titles: number; oldest: string; at: number };
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
