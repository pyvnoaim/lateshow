// Runs on crunchyroll.com. On the history page its card reads your watch history from Crunchyroll's own API (with
// the token its app holds, noted by crunchyroll-main.ts), fills in the entries that come without details, and turns
// it into Lateshow import rows (readCrunchyrollHistory, tested). Read only.
import { readCrunchyrollHistory, type CrunchyrollEntry } from "@/lib/library/importing";
import { showCard } from "./card";
import { getJson, pause, reader, type ReadHistory } from "./reader";

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

  // entries that came without details: asked for, 50 at a time (most are dubs of an episode already there)
  const bare = [...new Set(kept.filter((e) => e.fully_watched && !e.panel).map((e) => e.id))];
  for (let i = 0; i < bare.length; i += 50) {
    const found = (await api(
      `/content/v2/cms/objects/${bare
        .slice(i, i + 50)
        .map(encodeURIComponent)
        .join(",")}?locale=en-US`,
    )) as Page;
    const byId = new Map((found.data ?? []).map((o) => [o.id, o as CrunchyrollEntry["panel"]]));
    for (const e of kept) if (!e.panel && byId.has(e.id)) e.panel = byId.get(e.id);
  }

  const newest = Math.max(0, ...entries.map((e) => Date.parse(e.date_played ?? "") || 0));
  return { ...readCrunchyrollHistory(kept), oldest: shortDay(kept.at(-1)?.date_played), newest };
};

const SOURCE = "Crunchyroll";
if (location.pathname.startsWith("/history")) showCard(SOURCE, reader(SOURCE, readHistory));
