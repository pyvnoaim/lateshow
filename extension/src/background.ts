// Sends marks to Lateshow with the extension's key (content scripts can't call another site, this can). A mark that
// can't go out yet waits in a queue in storage with its real time, and goes out on the next mark or every 5 minutes.
// Lateshow ignores doubles, so retrying is safe.
import type { MarkResult } from "@/lib/extension/mark";

type Mark = { id: string; body: unknown; tries: number };
type Answer = MarkResult | { status: "queued" } | { status: "error"; message: string };

const API = `${__LATESHOW__}/api/extension`;

async function key() {
  return (await chrome.storage.local.get("key")).key as string | undefined;
}

async function call(method: "POST" | "DELETE", body: unknown): Promise<Response> {
  const k = await key();
  if (!k) throw new Error("not connected");
  return fetch(`${API}/mark`, {
    method,
    headers: { authorization: `Bearer ${k}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function queue(): Promise<Mark[]> {
  return ((await chrome.storage.local.get("queue")).queue as Mark[] | undefined) ?? [];
}

/** Sends what waits. 4xx means it will never work (bad mark, disconnected): dropped. Network or 5xx: kept. */
async function flush(): Promise<Map<string, Answer>> {
  const answers = new Map<string, Answer>();
  const left: Mark[] = [];
  for (const m of await queue()) {
    try {
      const res = await call("POST", m.body);
      if (res.ok) answers.set(m.id, (await res.json()) as MarkResult);
      else if (res.status >= 500) left.push({ ...m, tries: m.tries + 1 });
      else answers.set(m.id, { status: "error", message: ((await res.json()) as { error?: string }).error ?? "" });
    } catch {
      // ponytail: a mark that failed 50 times (days offline) is given up, so the queue can't grow forever
      if (m.tries < 50) left.push({ ...m, tries: m.tries + 1 });
    }
  }
  await chrome.storage.local.set({ queue: left });
  return answers;
}

/** The last few marks, newest first, for the popup's "Marked this week" (with Undo for what a mark created) */
export type Recent = { title: string; season?: number; episode?: number; ids: number[]; at: number; via: string };
async function remember(a: Answer | undefined, body: unknown) {
  if (a?.status !== "marked") return;
  const recent = ((await chrome.storage.local.get("recent")).recent as Recent[] | undefined) ?? [];
  const via = (body as { via?: string } | null)?.via ?? "";
  const r: Recent = { title: a.title, season: a.season, episode: a.episode, ids: a.ids, at: Date.now(), via };
  await chrome.storage.local.set({ recent: [r, ...recent].slice(0, 5) });
}

// --- Sync from the popup: the site's history page opens in a background tab, its reader reads what's new by itself
// and hands the rows here, the tab closes and the rows go to Lateshow's import in batches. The popup follows
// `syncState`. One sync at a time.

export type SyncState = {
  site: string;
  phase: "reading" | "importing" | "done" | "error";
  read?: number;
  done?: number;
  total?: number;
  result?: { episodes: number; films: number; series: number; unsure: number; notFound: number };
  message?: string;
  at: number;
};
type Job = { site: string; tabId: number; since: number; started: number };
// a job older than this is over (a suspended background may never have run its timeout)
const STALE = 5 * 60_000; // popup.ts keeps the same

const HISTORY: Record<string, string> = {
  Netflix: "https://www.netflix.com/settings/viewed",
  "Prime Video": "https://www.primevideo.com/settings/watch-history",
  Crunchyroll: "https://www.crunchyroll.com/history",
};
const BATCH = 40;

const local = <T>(k: string) => chrome.storage.local.get(k).then((r) => r[k] as T | undefined);
const setState = (s: Omit<SyncState, "at">) => chrome.storage.local.set({ syncState: { ...s, at: Date.now() } });

async function endJob(job: Job | undefined) {
  await chrome.storage.local.remove("job");
  if (job) await chrome.tabs.remove(job.tabId).catch(() => {});
}

async function startSync(site: string) {
  const running = await local<Job>("job");
  if (!HISTORY[site] || (running && Date.now() - running.started < STALE)) return;
  if (running) await endJob(running);
  const synced = (await local<Record<string, number>>("synced")) ?? {};
  const tab = await chrome.tabs.create({ url: HISTORY[site], active: false });
  if (!tab.id) return setState({ site, phase: "error", message: "The history page didn't open." });
  await chrome.storage.local.set({
    job: { site, tabId: tab.id, since: synced[site] ?? 0, started: Date.now() } satisfies Job,
  });
  await setState({ site, phase: "reading", read: 0 });
  // a page that never answers (signed out there, the site changed) doesn't keep the sync running forever
  setTimeout(async () => {
    const j = await local<Job>("job");
    if (j?.tabId !== tab.id) return;
    await endJob(j);
    await setState({ site, phase: "error", message: `${site} didn't answer. Open its history once and try again.` });
  }, 180_000);
}

async function importRows(job: Job, rows: unknown[], newest: number) {
  await endJob(job);
  const total = { episodes: 0, films: 0, series: 0, unsure: 0, notFound: 0 };
  let importId: string | undefined;
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      await setState({ site: job.site, phase: "importing", done: i, total: rows.length });
      const k = await key();
      const res = await fetch(`${API}/import`, {
        method: "POST",
        headers: { authorization: `Bearer ${k}`, "content-type": "application/json" },
        body: JSON.stringify({ source: job.site, importId, rows: rows.slice(i, i + BATCH) }),
      });
      const a = (await res.json()) as typeof total & { importId?: string; error?: string };
      if (!res.ok) throw new Error(a.error ?? `Lateshow answered ${res.status}`);
      importId = a.importId;
      for (const n of Object.keys(total) as (keyof typeof total)[]) total[n] += a[n] ?? 0;
    }
    // the next sync reads only what came after this one
    if (newest) {
      const synced = (await local<Record<string, number>>("synced")) ?? {};
      await chrome.storage.local.set({ synced: { ...synced, [job.site]: Math.max(synced[job.site] ?? 0, newest) } });
    }
    await setState({ site: job.site, phase: "done", result: total });
  } catch (e) {
    await setState({ site: job.site, phase: "error", message: (e as Error).message || "The import stopped." });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const msg = message as {
    type?: string;
    body?: unknown;
    ids?: number[];
    site?: string;
    titles?: number;
    rows?: unknown[];
    newest?: number;
    message?: string;
  };
  if (msg.type === "lateshow:mark") {
    const id = crypto.randomUUID();
    void queue()
      .then((q) => chrome.storage.local.set({ queue: [...q, { id, body: msg.body, tries: 0 }] }))
      .then(flush)
      .then(async (answers) => {
        await remember(answers.get(id), msg.body);
        sendResponse(answers.get(id) ?? { status: "queued" });
      });
    return true;
  }
  if (msg.type === "lateshow:sync" && msg.site) {
    void startSync(msg.site).then(() => sendResponse({ ok: true }));
    return true;
  }
  // a history page asks whether it was opened for a sync (only the job's own tab is)
  if (msg.type?.startsWith("lateshow:sync-")) {
    void local<Job>("job").then(async (job) => {
      const mine = job && sender.tab?.id === job.tabId ? job : undefined;
      if (msg.type === "lateshow:sync-job") return sendResponse(mine ? { since: mine.since } : null);
      sendResponse(null);
      if (!mine) return;
      if (msg.type === "lateshow:sync-progress")
        await setState({ site: mine.site, phase: "reading", read: msg.titles ?? 0 });
      if (msg.type === "lateshow:sync-rows") await importRows(mine, msg.rows ?? [], msg.newest ?? 0);
      if (msg.type === "lateshow:sync-error") {
        await endJob(mine);
        await setState({ site: mine.site, phase: "error", message: msg.message ?? "Reading stopped." });
      }
    });
    return true;
  }
  if (msg.type === "lateshow:undo") {
    call("DELETE", { ids: msg.ids })
      .then((res) => sendResponse({ ok: res.ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

chrome.alarms.create("flush", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(() => void flush());
void flush();
