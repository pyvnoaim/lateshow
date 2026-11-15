// Runs on crunchyroll.com. On the history page its card reads your watch history from Crunchyroll's own API (with
// the token its app holds, noted by crunchyroll-main.ts), fills in the entries that come without details, and turns
// it into Lateshow import rows (readCrunchyrollHistory, tested). On a player page it marks what you finish
// (watch.ts): the episode from the address, its details from the API, the video's position from the player frame
// (frame-video.ts). Read only on Crunchyroll's side.
import { readCrunchyrollHistory, type CrunchyrollEntry, type ImportRow } from "@/lib/library/importing";
import { showCard } from "./card";
import { getJson, pause, reader, type ReadHistory } from "./reader";
import { watch, type Clock } from "./watch";

type Auth = { auth: string | null; account: string | null };
type Page = { data?: CrunchyrollEntry[]; meta?: { next_page?: string } };

/** The token and account id from the page script, null when Crunchyroll's app hasn't called its API yet */
function ask(): Promise<Auth> {
  return new Promise((resolve) => {
    const answer = (e: MessageEvent) => {
      const d = e.data as ({ type?: string } & Auth) | null;
      if (e.source !== window || d?.type !== "lateshow:cr-auth") return;
      window.removeEventListener("message", answer);
      resolve(d);
    };
    window.addEventListener("message", answer);
    window.postMessage({ type: "lateshow:cr-ask" }, location.origin);
    setTimeout(() => {
      window.removeEventListener("message", answer);
      resolve({ auth: null, account: null });
    }, 1500);
  });
}

const shortDay = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "";

const readHistory: ReadHistory = async (onProgress, since) => {
  const asked = await ask();
  const auth = asked.auth;
  let account = asked.account;
  // the page's app hasn't asked its API yet (the script came too late): one reload and it has
  if (!auth) throw new Error("Crunchyroll hasn't loaded your history here yet. Reload this page, then try again.");
  const api = (path: string) => getJson(path, { authorization: auth! });
  account ??= ((await api("/accounts/v1/me")) as { account_id?: string }).account_id ?? null;
  if (!account) throw new Error("Crunchyroll didn't say which account this is. Reload this page, then try again.");

  const entries: CrunchyrollEntry[] = [];
  let next: string | undefined = `/content/v2/${account}/watch-history?locale=en-US&page_size=100`;
  // ponytail: 500 pages cap (100 entries each), so a loop in Crunchyroll's paging can't run forever
  for (let pages = 1; next && pages <= 500; pages++) {
    const page = (await api(next)) as Page;
    entries.push(...(page.data ?? []));
    onProgress({ pages, titles: entries.length, oldest: shortDay(entries.at(-1)?.date_played), at: Date.now() });
    // "Read new": a page that reaches back past the last import is the last one needed
    if (since && Date.parse(entries.at(-1)?.date_played ?? "") <= since) break;
    // only Crunchyroll's own API paths: the token goes along with every request
    next = page.meta?.next_page?.startsWith("/content/v2/") ? page.meta.next_page : undefined;
    if (next) await pause(250); // gently, one page at a time
  }
  const kept = since ? entries.filter((e) => Date.parse(e.date_played ?? "") > since) : entries;

  // entries that came without details: asked for, 50 at a time. Best effort, never stops the read: Crunchyroll
  // turns down a whole batch for one episode it no longer has, so a failed batch is split in half until only the
  // gone ones are left (skipped, most are dubs of an episode already there)
  const bare = [...new Set(kept.filter((e) => e.fully_watched && !e.panel).map((e) => e.id))];
  const details = new Map<string, CrunchyrollEntry["panel"]>();
  const lookUp = async (ids: string[]): Promise<void> => {
    try {
      const found = (await api(
        `/content/v2/cms/objects/${ids.map(encodeURIComponent).join(",")}?locale=en-US`,
      )) as Page;
      for (const o of found.data ?? []) details.set(o.id, o as CrunchyrollEntry["panel"]);
    } catch {
      if (ids.length === 1) return;
      await lookUp(ids.slice(0, ids.length / 2));
      await lookUp(ids.slice(ids.length / 2));
    }
  };
  for (let i = 0; i < bare.length; i += 50) await lookUp(bare.slice(i, i + 50));
  for (const e of kept) if (!e.panel && details.has(e.id)) e.panel = details.get(e.id);

  const newest = Math.max(0, ...entries.map((e) => Date.parse(e.date_played ?? "") || 0));
  return { ...readCrunchyrollHistory(kept), oldest: shortDay(kept.at(-1)?.date_played), newest };
};

const SOURCE = "Crunchyroll";
// the address may carry a language (/de/history)
if (/^(\/[a-z]{2}(-[a-z]{2})?)?\/history/.test(location.pathname)) showCard(SOURCE, reader(SOURCE, readHistory));

// --- marking what you finish

// the player frame's reports, a few seconds old at most (no reports: the video is in this page, watch.ts reads it)
let frame: { clock: Clock; at: number } | null = null;
window.addEventListener("message", (e) => {
  const d = e.data as ({ type?: string } & Partial<Clock>) | null;
  if (e.origin !== "https://static.crunchyroll.com" || d?.type !== "lateshow:tick") return;
  frame = {
    clock: { at: Number(d.at), duration: Number(d.duration), rate: Number(d.rate) || 1, paused: Boolean(d.paused) },
    at: Date.now(),
  };
});

// each episode's details once (the next one starting on its own changes the address, so it's looked up then)
const playingRows = new Map<string, Promise<ImportRow | null>>();
function playing(): Promise<ImportRow | null> {
  const id = /\/watch\/([A-Z0-9]+)/i.exec(location.pathname)?.[1];
  if (!id) return Promise.resolve(null);
  if (!playingRows.has(id))
    playingRows.set(
      id,
      (async () => {
        const { auth } = await ask();
        if (!auth) return null;
        const found = (await getJson(`/content/v2/cms/objects/${encodeURIComponent(id)}?locale=en-US`, {
          authorization: auth,
        })) as Page;
        const panel = found.data?.[0] as CrunchyrollEntry["panel"] | undefined;
        if (!panel) return null;
        // the same reading as the import, so a marked episode is described the same way
        const { rows } = readCrunchyrollHistory([
          { id, fully_watched: true, date_played: new Date().toISOString(), panel },
        ]);
        return rows[0] ?? null;
      })().catch(() => {
        playingRows.delete(id); // try again next time
        return null;
      }),
    );
  return playingRows.get(id)!;
}

let accountId: string | null = null;

/** Crunchyroll's own "Watched" for the episode playing (its playheads API), null when it can't tell */
async function done(): Promise<boolean | null> {
  const id = /\/watch\/([A-Z0-9]+)/i.exec(location.pathname)?.[1];
  if (!id) return null;
  try {
    const { auth, account } = await ask();
    if (!auth) return null;
    accountId ??=
      account ??
      ((await getJson("/accounts/v1/me", { authorization: auth })) as { account_id?: string }).account_id ??
      null;
    if (!accountId) return null;
    const res = (await getJson(
      `/content/v2/${accountId}/playheads?content_ids=${encodeURIComponent(id)}&locale=en-US`,
      { authorization: auth },
    )) as { data?: { content_id?: string; fully_watched?: boolean }[] };
    const mine = res.data?.find((d) => d.content_id === id);
    return mine ? Boolean(mine.fully_watched) : null;
  } catch {
    return null; // the counting here decides then
  }
}

// your active Crunchyroll profile's name (its multiprofile API marks the selected one), asked until it answers
let profile: string | null = null;
async function loadProfile() {
  const { auth } = await ask();
  if (!auth) return;
  const res = (await getJson("/accounts/v1/me/multiprofile", { authorization: auth })) as {
    profiles?: { profile_name?: string; is_selected?: boolean }[];
  };
  profile = res.profiles?.find((p) => p.is_selected)?.profile_name ?? null;
}
// on every page: Crunchyroll changes pages without reloading, an episode may start from anywhere
const retry = window.setInterval(() => {
  if (profile) return window.clearInterval(retry);
  void loadProfile().catch(() => {});
}, 5000);

watch({
  via: SOURCE,
  playing,
  done,
  // only your profile is marked (the first that finishes something here, changeable in the popup)
  profile: () => profile,
  clock: () => (frame && Date.now() - frame.at < 3000 ? frame.clock : null),
});
