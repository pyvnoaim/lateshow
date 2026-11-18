// Runs on netflix.com. On your viewing activity its card reads your history from Netflix's own API (the call the
// page's Show more makes, with your Netflix sign-in, for the profile you're on) into Lateshow import rows
// (readNetflixHistory, tested). On a player page it marks what you finish (watch.ts): the episode from the address,
// its season, number and Netflix's own "watched to the end" point from Netflix's metadata. Read only on Netflix's side.
import {
  checkRead,
  netflixPage,
  readNetflixHistory,
  readNetflixWatchlist,
  type ImportRow,
  type NetflixListAnswer,
  type NetflixViewed,
} from "@/lib/library/importing";
import { showCard } from "./card";
import { answer, getJson, historyPage, pageFetch, pause, reader, type ReadHistory } from "./reader";
import { plusOne } from "./plusone";
import { watch, type Clock } from "./watch";

type Ids = { guid: string | null; build: string | null; name?: string | null };

/** The profile and build ids from the page script (netflix-main.ts) */
function ask(): Promise<Ids> {
  return new Promise((resolve) => {
    const answer = (e: MessageEvent) => {
      const d = e.data as ({ type?: string } & Ids) | null;
      if (e.source !== window || d?.type !== "lateshow:nf-ids") return;
      window.removeEventListener("message", answer);
      resolve(d);
    };
    window.addEventListener("message", answer);
    window.postMessage({ type: "lateshow:nf-ask" }, location.origin);
    setTimeout(() => {
      window.removeEventListener("message", answer);
      resolve({ guid: null, build: null, name: null });
    }, 1500);
  });
}

const PAGE = 50; // what the page itself asks for

/** One page of your viewing activity, newest first. Without Netflix's routing headers its edge answers BLOCKED. */
async function page(n: number, { guid, build }: Ids) {
  const path = encodeURIComponent(JSON.stringify(["aui", "viewingActivity", n, PAGE]));
  const res = await pageFetch(`/api/aui/pathEvaluator/web/%5E2.0.0?method=call&callPath=${path}&falcor_server=0.1.0`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-netflix.request.routing": JSON.stringify({
        path: "/nq/aui/endpoint/%5E1.0.0-web/pathEvaluator",
        control_tag: "auinqweb",
      }),
      "x-netflix.nq.stack": "prod",
      "x-netflix.uiversion": build ?? "",
      "x-netflix.clienttype": "akira",
      "x-netflix.client.request.name": "ui/xhrUnclassified",
    },
    body: "param=" + encodeURIComponent(JSON.stringify({ guid })),
  });
  return netflixPage(answer(res, await res.text()));
}

const shortDay = (ms?: number) =>
  ms ? new Date(ms).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "";

const readHistory: ReadHistory = async (onProgress, since, opts) => {
  const ids = await ask();
  if (!ids.guid) throw new Error("Netflix didn't say which profile this is. Reload this page, then try again.");
  const items: NetflixViewed[] = [];
  // ponytail: 400 pages cap (50 each), so a loop in Netflix's paging can't run forever
  for (let n = 0; n < 400; n++) {
    const { vhSize, viewedItems = [] } = await page(n, ids);
    items.push(...viewedItems);
    onProgress({ pages: n + 1, titles: items.length, oldest: shortDay(items.at(-1)?.date), at: Date.now() });
    if (!viewedItems.length || items.length >= (vhSize ?? Infinity)) break;
    // "Read new": a page that reaches back past the last import is the last one needed
    if (since && (items.at(-1)?.date ?? 0) <= since) break;
    await pause(250); // gently, one page at a time
  }
  const kept = since ? items.filter((v) => (v.date ?? 0) > since) : items;
  await finishedOnly(kept, (done, all) =>
    onProgress({
      pages: 0,
      titles: kept.length,
      oldest: "",
      at: Date.now(),
      step: `Checking what you finished · ${done} of ${all}`,
    }),
  );
  const newest = Math.max(0, ...items.map((v) => v.date ?? 0));
  const read = checkRead(readNetflixHistory(kept, since > 0));
  // My List along (a sync with the popup's switch on), best effort
  if (opts?.watchlist)
    read.rows.push(
      ...(await myList(ids.build, (done, all) =>
        onProgress({
          pages: 0,
          titles: kept.length,
          oldest: "",
          at: Date.now(),
          step: `Reading My List · ${done} of ${all}`,
        }),
      ).catch(() => [])),
    );
  return { ...read, oldest: shortDay(kept.at(-1)?.date), newest, profile: ids.name ?? null };
};

/**
 * My List of the profile you're on, from Netflix's Falcor API (the old one, not the history's AUI): one request for
 * all of it. Without `original_path` it answers 412, any build id there will do. A show's year is its first season's,
 * from its metadata (the list's is the latest season's, which can't tell the anime One Piece from the live action).
 */
async function myList(build: string | null, onProgress: (done: number, all: number) => void): Promise<ImportRow[]> {
  const path = encodeURIComponent(`/shakti/${build ?? "release"}/pathEvaluator`);
  const res = await pageFetch(
    `/nq/website/memberapi/release/pathEvaluator?withSize=true&materialize=true&original_path=${path}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      // ponytail: the first 2000, past what a list holds (Netflix answers them in one go)
      body:
        "path=" +
        encodeURIComponent(JSON.stringify(["mylist", { from: 0, to: 1999 }, ["title", "releaseYear", "summary"]])),
    },
  );
  if (!res.ok) throw new Error(`Netflix answered ${res.status} for My List`);
  const rows = readNetflixWatchlist((await res.json()) as NetflixListAnswer);
  // ponytail: years for the first 300 shows (~2 min), the rest match by name, so a sync stays inside its 5 minutes
  const shows = rows.filter((r) => r.type === "tv").slice(0, 300);
  for (const [i, row] of shows.entries()) {
    onProgress(i, shows.length);
    try {
      const v = (
        (await getJson(`/nq/website/memberapi/release/metadata?movieid=${row.refs![0].slice(8)}`)) as {
          video?: { seasons?: { year?: number }[] };
        }
      ).video;
      const first = Math.min(...(v?.seasons ?? []).map((s) => s.year ?? Infinity));
      if (Number.isFinite(first)) row.year = first;
    } catch {
      // no year: matched by name, like Prime's shows
    }
    await pause(150); // gently
  }
  return rows;
}

type Bookmark = { offset?: number };
type MetaEpisode = { id?: number; episodeId?: number; seq?: number; watchedToEndOffset?: number; bookmark?: Bookmark };
type TitleMeta = {
  video?: {
    runtime?: number;
    watchedToEndOffset?: number;
    bookmark?: Bookmark;
    seasons?: { seq?: number; episodes?: MetaEpisode[] }[];
  };
};

/**
 * Netflix's history lists what you only started too, and episodes by name only. Its metadata, one request per show or
 * film, knows each episode's real numbers and where you stopped: past Netflix's own "watched to the end" point (a
 * film: 90% of it) is finished. Best effort, a title it can't look up stays as the history has it.
 * ponytail: the bookmark is your last watch, a finished episode you later rewatched partly counts as unfinished.
 */
async function finishedOnly(items: NetflixViewed[], onProgress: (done: number, all: number) => void) {
  const ids = [...new Set(items.map((v) => v.series ?? v.movieID).filter((id): id is number => Boolean(id)))];
  const found = new Map<number, { season?: number; episode?: number; finished?: boolean }>();
  for (const [i, id] of ids.entries()) {
    onProgress(i, ids.length);
    try {
      const v = ((await getJson(`/nq/website/memberapi/release/metadata?movieid=${id}`)) as TitleMeta).video;
      const done = (b: Bookmark | undefined, end: number | undefined) =>
        b?.offset === undefined || !end ? undefined : b.offset >= end;
      if (!v?.seasons) found.set(id, { finished: done(v?.bookmark, v?.watchedToEndOffset ?? (v?.runtime ?? 0) * 0.9) });
      for (const s of v?.seasons ?? [])
        for (const e of s.episodes ?? [])
          found.set(e.episodeId ?? e.id ?? 0, {
            season: s.seq,
            episode: e.seq,
            finished: done(e.bookmark, e.watchedToEndOffset),
          });
    } catch {
      // not found (gone from Netflix): as the history has it
    }
    await pause(150); // gently
  }
  for (const v of items) {
    const f = v.movieID ? found.get(v.movieID) : undefined;
    if (f) Object.assign(v, f);
  }
}

const SOURCE = "Netflix";
if (/\/(settings\/viewed|viewingactivity)/.test(location.pathname))
  historyPage(SOURCE, readHistory, () => showCard(SOURCE, reader(SOURCE, readHistory)));

// --- marking what you finish

type Episode = { id?: number; episodeId?: number; title?: string; seq?: number; watchedToEndOffset?: number };
type Meta = {
  video?: {
    type?: string; // "show", "movie"
    id?: number;
    title?: string;
    year?: number;
    watchedToEndOffset?: number;
    seasons?: { seq?: number; episodes?: Episode[] }[];
  };
};
type Playing = { row: ImportRow; end: number | null };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** What Netflix's metadata says about this id: the row to mark and the second Netflix counts as watched to the end */
function describe(id: number, meta: Meta): Playing | null {
  const v = meta.video;
  if (!v?.title) return null;
  if (v.type === "movie")
    return {
      row: {
        title: v.title,
        year: v.year,
        type: "movie",
        list: "watched",
        date: today(),
        refs: [`netflix:${v.id ?? id}`],
      },
      end: v.watchedToEndOffset ?? null,
    };
  for (const s of v.seasons ?? [])
    for (const e of s.episodes ?? [])
      if ((e.episodeId ?? e.id) === id)
        return {
          row: {
            title: v.title,
            type: "tv",
            list: "watched",
            date: today(),
            refs: [`netflix:${v.id}`],
            episodes: [
              { season: s.seq, episode: e.seq, name: e.title || `Episode ${e.seq ?? ""}`.trim(), date: today() },
            ],
          },
          end: e.watchedToEndOffset ?? null,
        };
  return null;
}

// each title's details once (the next episode starting on its own changes the address, so it's looked up then)
const looked = new Map<number, Promise<Playing | null>>();
let current: Playing | null = null;
function lookUp(): Promise<Playing | null> {
  const id = Number(/\/watch\/(\d+)/.exec(location.pathname)?.[1]);
  if (!id) return Promise.resolve(null);
  if (!looked.has(id))
    looked.set(
      id,
      getJson(`/nq/website/memberapi/release/metadata?movieid=${id}`)
        .then((m) => describe(id, m as Meta))
        .catch(() => {
          looked.delete(id); // try again next time
          return null;
        }),
    );
  return looked.get(id)!.then((p) => (current = p));
}

// the episode's position from Netflix's player API (netflix-main.ts), a few seconds old at most
let clock: { clock: Clock; at: number } | null = null;
window.addEventListener("message", (e) => {
  const d = e.data as ({ type?: string } & Partial<Clock>) | null;
  if (e.source !== window || d?.type !== "lateshow:nf-tick") return;
  clock = {
    clock: { at: Number(d.at), duration: Number(d.duration), rate: Number(d.rate) || 1, paused: Boolean(d.paused) },
    at: Date.now(),
  };
});
const now = () => (clock && Date.now() - clock.at < 3000 ? clock.clock : null);

let profile: string | null = null;
if (location.pathname.startsWith("/watch/")) void ask().then((ids) => (profile = ids.name ?? null));

watch({
  via: SOURCE,
  playing: async () => (await lookUp())?.row ?? null,
  clock: now,
  // an ad break (plans with ads): its seconds aren't watching
  ad: () => Boolean(document.querySelector('[data-uia="ads-info-container"]')),
  // Netflix's own "watched to the end" point (just before the credits): past it counts like the credits starting
  credits: () => {
    void lookUp();
    const at = now()?.at;
    return Boolean(at !== undefined && current?.end && at >= current.end);
  },
  profile: () => profile,
});

// Plus one's "Open S1 E3 on Netflix" (Lateshow's room page, through background.ts): the title opened, find the episode
// in Netflix's own metadata (TMDB's numbers are Netflix's seq for nearly every show) and play it. A minute at most,
// once. Not found: the title's own play, Netflix picks.
async function openFromRoom() {
  const o = (await chrome.storage.local.get("plusOneOpen")).plusOneOpen as
    { id: string; season?: number; episode?: number; at: number } | undefined;
  if (!o || Date.now() - o.at > 60_000) return;
  await chrome.storage.local.remove("plusOneOpen");
  let target = o.id;
  if (o.season != null && o.episode != null) {
    const meta = (await getJson(`/nq/website/memberapi/release/metadata?movieid=${o.id}`).catch(() => null)) as Meta;
    const ep = meta?.video?.seasons?.find((s) => s.seq === o.season)?.episodes?.find((e) => e.seq === o.episode);
    const id = ep?.episodeId ?? ep?.id;
    if (id) target = String(id);
  }
  location.assign(`/watch/${target}`);
}
void openFromRoom();

// Plus one: your player follows the room's while the popup has you in one (Netflix moves between pages without a
// reload, so this always runs, the clock is there only on a player page)
plusOne({
  clock: () => (clock && Date.now() - clock.at < 3000 ? { ...clock.clock, t: clock.at } : null),
  control: (c) => window.postMessage({ type: "lateshow:nf-control", ...c }, location.origin),
  episode: () => {
    const e = current?.row.episodes?.[0];
    return e ? { season: e.season, episode: e.episode } : null;
  },
});
