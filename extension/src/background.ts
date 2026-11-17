// Sends marks to Lateshow with the extension's key (content scripts can't call another site, this can). A mark that
// can't go out yet waits in a queue in storage with its real time, and goes out on the next mark or every 5 minutes.
// Lateshow ignores doubles, so retrying is safe.
import type { MarkResult } from "@/lib/extension/mark";
import type { PlusOneState } from "@/lib/rooms/plusOne";

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
  result?: { episodes: number; films: number; series: number; watchlist?: number; unsure: number; notFound: number };
  message?: string;
  /** the site's profile it synced */
  profile?: string | null;
  /** sites waiting their turn (Sync clicked while one ran), first is next */
  queued?: string[];
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
// the queue rides along in the state, so the popup and Settings show "Queued" without asking twice
const setState = async (s: Omit<SyncState, "at" | "queued">) => {
  const queued = (await local<string[]>("syncQueue")) ?? [];
  await chrome.storage.local.set({ syncState: { ...s, queued, at: Date.now() } });
  // a sync that ended hands over to the next one waiting
  if (s.phase === "done" || s.phase === "error") void next();
};
async function setQueue(queued: string[]) {
  await chrome.storage.local.set({ syncQueue: queued });
  const state = await local<SyncState>("syncState");
  if (state) await chrome.storage.local.set({ syncState: { ...state, queued } });
}
async function next() {
  const [site, ...rest] = (await local<string[]>("syncQueue")) ?? [];
  if (!site) return;
  await setQueue(rest);
  await startSync(site);
}

async function endJob(job: Job | undefined) {
  await chrome.storage.local.remove("job");
  if (job) await chrome.tabs.remove(job.tabId).catch(() => {});
}

async function startSync(site: string) {
  const running = await local<Job>("job");
  // still reading (the tab), or importing what it read (the tab is gone then, the state says so): one at a time
  const state = await local<SyncState>("syncState");
  const importing = state?.phase === "importing" && Date.now() - state.at < STALE;
  if (!HISTORY[site]) return;
  // one at a time: a Sync clicked meanwhile waits its turn (once, never the one running)
  if (importing || (running && Date.now() - running.started < STALE)) {
    const queued = (await local<string[]>("syncQueue")) ?? [];
    if (site !== (running?.site ?? state?.site) && !queued.includes(site)) await setQueue([...queued, site]);
    return;
  }
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

async function importRows(job: Job, rows: unknown[], newest: number, profile: string | null) {
  await endJob(job);
  // only your profile's history comes in, the same rule as marking: the first one is yours, the popup changes it
  if (profile) {
    const settings = (await local<{ profiles?: Record<string, string> }>("settings")) ?? {};
    const mine = settings.profiles?.[job.site];
    if (mine && mine !== profile)
      return setState({
        site: job.site,
        phase: "error",
        message: `${job.site} is on ${profile}, not ${mine}. Switch to ${mine} there and sync again.`,
      });
    if (!mine)
      await chrome.storage.local.set({
        settings: { ...settings, profiles: { ...settings.profiles, [job.site]: profile } },
      });
  }
  const total = { episodes: 0, films: 0, series: 0, watchlist: 0, unsure: 0, notFound: 0 };
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
    // when it last synced (the popup says so), apart from how far it read
    {
      const at = (await local<Record<string, number>>("syncedAt")) ?? {};
      await chrome.storage.local.set({ syncedAt: { ...at, [job.site]: Date.now() } });
    }
    await setState({ site: job.site, phase: "done", result: total, profile });
  } catch (e) {
    await setState({ site: job.site, phase: "error", message: (e as Error).message || "The import stopped." });
  }
}

// The job's tab finished loading somewhere other than the history page: the site sent it to sign in (Netflix /login,
// Amazon's or Crunchyroll's sign-in on another address, whose url this can't even see). Says so at once instead of
// waiting for the timeout.
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete") return;
  void local<Job>("job").then(async (job) => {
    if (job?.tabId !== tabId) return;
    // the history page, maybe with a language in front (/de/history), else signed out or a profile to pick
    const want = new URL(HISTORY[job.site]);
    const url = tab.url ? new URL(tab.url) : null;
    if (url && url.hostname === want.hostname && url.pathname.includes(want.pathname)) return;
    await endJob(job);
    await setState({
      site: job.site,
      phase: "error",
      message: `Open ${job.site} in this browser, signed in and on your profile, then sync again.`,
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const msg = message as {
    type?: string;
    body?: unknown;
    ids?: number[];
    site?: string;
    code?: string;
    titles?: number;
    rows?: unknown[];
    newest?: number;
    message?: string;
    profile?: string | null;
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
      if (msg.type === "lateshow:sync-job") {
        // the popup's switch: watchlists come along unless it's off
        const settings = (await local<{ watchlists?: boolean }>("settings")) ?? {};
        return sendResponse(mine ? { since: mine.since, watchlist: settings.watchlists !== false } : null);
      }
      sendResponse(null);
      if (!mine) return;
      if (msg.type === "lateshow:sync-progress")
        await setState({ site: mine.site, phase: "reading", read: msg.titles ?? 0 });
      if (msg.type === "lateshow:sync-rows")
        await importRows(mine, msg.rows ?? [], msg.newest ?? 0, (msg.profile as string | null | undefined) ?? null);
      if (msg.type === "lateshow:sync-error") {
        await endJob(mine);
        await setState({ site: mine.site, phase: "error", message: msg.message ?? "Reading stopped." });
      }
    });
    return true;
  }
  if (msg.type === "lateshow:plusone-join" && msg.code) {
    void joinRoom(msg.code).then(sendResponse);
    return true;
  }
  if (msg.type === "lateshow:plusone-leave") {
    void chrome.storage.local.remove("plusOne").then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "lateshow:undo") {
    call("DELETE", { ids: msg.ids })
      .then((res) => sendResponse({ ok: res.ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

// --- Plus one: a player page connects a port (plusone.ts) while the popup has you in a room. This reads the room's
// stream for it (fetch with the key, a stream EventSource can't send it with) and sends its moves. For the popup it
// keeps what happened last in `plusOneStatus`.

export type PlusOneStatus = { code: string; name?: string; playing?: boolean; at: number; error?: string };

const room = (code: string) => `${API}/rooms/${encodeURIComponent(code)}`;

async function leave(code: string, error?: string) {
  if ((await local<string>("plusOne")) !== code) return;
  await chrome.storage.local.remove("plusOne");
  await chrome.storage.local.set({ plusOneStatus: { code, at: Date.now(), error } satisfies PlusOneStatus });
}

async function followRoom(port: chrome.runtime.Port, signal: AbortSignal) {
  while (!signal.aborted) {
    const code = await local<string>("plusOne");
    const k = await key();
    if (!code || !k) return port.disconnect();
    try {
      const res = await fetch(room(code), { headers: { authorization: `Bearer ${k}` }, signal });
      if (res.status === 401 || res.status === 404) {
        port.postMessage({ gone: true });
        await leave(code, res.status === 404 ? "That room is gone." : "Connect the extension again.");
        return port.disconnect();
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const chunk = await reader?.read();
        if (!chunk || chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          if (ev.startsWith("event: gone")) {
            port.postMessage({ gone: true });
            await leave(code, "The room is over.");
            return port.disconnect();
          }
          if (ev.startsWith(": ")) port.postMessage({ offset: Number(ev.slice(2)) - Date.now() });
          if (!ev.startsWith("data: ")) continue;
          const state = JSON.parse(ev.slice(6)) as PlusOneState;
          port.postMessage({ state, offset: state.now - Date.now() });
          const p = state.playback;
          await chrome.storage.local.set({
            plusOneStatus: { code, name: p?.name, playing: p?.playing, at: Date.now() } satisfies PlusOneStatus,
          });
        }
      }
    } catch {
      if (signal.aborted) return;
    }
    await new Promise((r) => setTimeout(r, 2000)); // the stream ended (it does every 15 minutes): again
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "plusone") return;
  const ctl = new AbortController();
  port.onDisconnect.addListener(() => ctl.abort());
  port.onMessage.addListener((raw) => {
    const move = (raw as { move?: unknown }).move;
    if (!move) return;
    void Promise.all([local<string>("plusOne"), key()]).then(([code, k]) => {
      if (!code || !k) return;
      return fetch(room(code), {
        method: "POST",
        headers: { authorization: `Bearer ${k}`, "content-type": "application/json" },
        body: JSON.stringify(move),
      }).catch(() => {}); // ponytail: a lost move isn't retried, the room's next state pulls everyone together
    });
  });
  void followRoom(port, ctl.signal);
});

/** The popup's Join: is it a room you're in? Reads the stream's first state and stops. */
async function joinRoom(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const k = await key();
  if (!k) return { ok: false, message: "Connect the extension first." };
  const ctl = new AbortController();
  try {
    const res = await fetch(room(code), { headers: { authorization: `Bearer ${k}` }, signal: ctl.signal });
    if (res.status === 404)
      return { ok: false, message: "No room with that code that you're in. Join it on Lateshow first." };
    if (!res.ok) return { ok: false, message: "Lateshow didn't answer. Try again." };
    await chrome.storage.local.set({
      plusOne: code,
      plusOneStatus: { code, at: Date.now() } satisfies PlusOneStatus,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Lateshow didn't answer. Try again." };
  } finally {
    ctl.abort();
  }
}

chrome.alarms.create("flush", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(() => void flush());
void flush();
