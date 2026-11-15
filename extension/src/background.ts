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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as { type?: string; body?: unknown; ids?: number[] };
  if (msg.type === "lateshow:mark") {
    const id = crypto.randomUUID();
    void queue()
      .then((q) => chrome.storage.local.set({ queue: [...q, { id, body: msg.body, tries: 0 }] }))
      .then(flush)
      .then((answers) => sendResponse(answers.get(id) ?? { status: "queued" }));
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
