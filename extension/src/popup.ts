// The popup (drafts: the popup canvas). Not connected: what it does, Connect, and the sites' history pages for a first
// import by hand. Connected: a sync that runs or just ran, what was marked lately (Undo), then one line per site with
// when it last synced, Sync (background.ts reads and imports, see there) and the switch that marks what you finish.
import type { PlusOneStatus, Recent, SyncState } from "./background";

// as background.ts: a sync job older than this is over (types only from there, its code must not run here)
const STALE = 5 * 60_000;

const PRIME = "https://www.primevideo.com";
// logo: the service's own (extension/logos, TMDB's provider logo)
const SITES = [
  { site: "Netflix", logo: "netflix", url: "https://www.netflix.com/settings/viewed" },
  { site: "Prime Video", logo: "prime", url: `${PRIME}/settings/watch-history` },
  { site: "Crunchyroll", logo: "crunchyroll", url: "https://www.crunchyroll.com/history" },
];
const ORIGINS = [
  `${PRIME}/*`,
  "https://www.crunchyroll.com/*",
  "https://static.crunchyroll.com/*", // Crunchyroll's player frame, where the video plays
  "https://www.netflix.com/*",
  `${__LATESHOW_MATCH__}/*`,
];
// a finished sync stays on top this long, then it's history
const SHOW_DONE = 10 * 60_000;

/** `watchlists`: a sync brings the sites' watchlists too (on unless switched off) */
type Settings = {
  autoMark?: Partial<Record<string, boolean>>;
  profiles?: Partial<Record<string, string>>;
  watchlists?: boolean;
};

const app = document.getElementById("app")!;
const who = document.getElementById("who")!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}
const store = <T>(k: string) => chrome.storage.local.get(k).then((r) => r[k] as T | undefined);

// stroke icons (lucide's shapes), built as SVG nodes, never from HTML
function icon(paths: string[], size = 14) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [k, v] of Object.entries({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2.2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }))
    svg.setAttribute(k, String(v));
  for (const d of paths) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}
const SYNC = ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"];
const CHECK = ["m5 12 5 5 9-10"];
const CHEVRON = ["m9 6 6 6-6 6"];

const day = (ms: number) => new Date(ms).toLocaleDateString("en", { month: "short", day: "numeric" });
function when(ms: number) {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString("en", { weekday: "short" })} ${time}`;
}
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

function badge(s: (typeof SITES)[number], size = 26) {
  const b = el("img", "badge");
  b.src = `logos/${s.logo}.png`;
  b.alt = "";
  b.width = b.height = size;
  return b;
}

/** Who the key belongs to, null when there's none or Lateshow says it's disconnected (then it's forgotten) */
async function account(): Promise<string | null> {
  const key = await store<string>("key");
  if (!key) return null;
  const res = await fetch(`${__LATESHOW__}/api/extension/me`, { headers: { authorization: `Bearer ${key}` } }).catch(
    () => null,
  );
  if (res?.status === 401) {
    await chrome.storage.local.remove("key");
    return null;
  }
  return res?.ok ? ((await res.json()) as { name: string }).name || "your account" : "your account";
}

async function openTab(url: string) {
  await chrome.tabs.create({ url });
  window.close();
}

/** A: not connected yet */
function connectScreen() {
  const hero = el("section", "hero");
  hero.append(
    el("h2", "", "What you finish, marked by itself."),
    el("p", "", "Connect this browser to your Lateshow account. It can then mark episodes you finish. Nothing else."),
  );
  const connect = el("button", "primary", "Connect");
  connect.addEventListener("click", () => void openTab(`${__LATESHOW__}/settings?connect=extension#account`));
  const first = el("section", "first");
  first.append(el("p", "label", "Or bring your history first"));
  const tiles = el("div", "tiles");
  for (const s of SITES) {
    const t = el("button", "tile");
    t.append(badge(s, 28), el("span", "", s.site));
    t.addEventListener("click", () => void openTab(s.url));
    tiles.append(t);
  }
  first.append(tiles, el("p", "note", "Each opens your watch history there, the card reads it."));
  app.append(hero, connect, first);
}

/** A running sync's moving parts, updated in place (rebuilding the card each step made it flicker) */
function progress(card: HTMLElement, s: SyncState) {
  const fill = card.querySelector<HTMLElement>(".fill");
  if (fill && s.phase === "importing" && s.total) fill.style.width = `${Math.round((100 * (s.done ?? 0)) / s.total)}%`;
  const line =
    s.phase === "reading"
      ? `Reading in a background tab · ${plural(s.read ?? 0, "title")}`
      : `Matching · ${(s.done ?? 0).toLocaleString("en")} of ${plural(s.total ?? 0, "title")}`;
  card.querySelector(".note")!.textContent = `${line}. You can close this.`;
}

/** D: a sync that runs, or one that just ended */
function syncCard(s: SyncState) {
  const site = SITES.find((x) => x.site === s.site);
  const card = el("section", "sync");
  card.dataset.phase = s.phase;
  const head = el("div", "sync-head");
  if (site) head.append(badge(site, 22));
  if (s.phase === "reading" || s.phase === "importing") {
    head.append(el("span", "", `Syncing ${s.site}`));
    // reading: how much there is isn't known, a light runs. Matching: the share of titles done
    const bar = el("div", s.phase === "reading" ? "bar running" : "bar");
    const fill = el("div", "fill");
    bar.append(fill);
    card.append(head, bar, el("p", "note"));
    progress(card, s);
    return card;
  }
  if (s.phase === "error") {
    head.append(el("span", "", `${s.site} didn't sync`));
    const again = el("button", "pill", "Try again");
    again.addEventListener("click", () => void chrome.runtime.sendMessage({ type: "lateshow:sync", site: s.site }));
    card.append(head, el("p", "note", s.message ?? ""), again);
    return card;
  }
  const r = s.result ?? { episodes: 0, films: 0, series: 0, unsure: 0, notFound: 0 };
  const ok = el("span", "ok");
  ok.append(icon(CHECK, 14));
  head.append(ok, el("span", "", s.profile ? `${s.site} is in sync · ${s.profile}` : `${s.site} is in sync`));
  const close = el("button", "x", "×");
  close.setAttribute("aria-label", "Hide");
  close.addEventListener("click", () => void chrome.storage.local.remove("syncState"));
  head.append(close);
  card.append(head);
  const counts = [
    r.episodes && plural(r.episodes, "episode"),
    r.films && plural(r.films, "film"),
    r.watchlist && `${r.watchlist.toLocaleString("en")} on your watchlist`,
  ].filter(Boolean);
  card.append(el("p", "big", counts.length ? `${counts.join(" · ")} new` : "All of it was in Lateshow already"));
  if (r.unsure) {
    const look = el("button", "look");
    look.append(el("span", "", `${plural(r.unsure, "title")} need a look in Lateshow`), icon(CHEVRON));
    look.addEventListener("click", () => void openTab(`${__LATESHOW__}/settings#account`));
    card.append(look);
  }
  return card;
}

/** C: what was marked lately */
function recentList(recent: Recent[]) {
  const week = recent.filter((r) => Date.now() - r.at < 7 * 86_400_000).slice(0, 3);
  if (!week.length) return null;
  const sec = el("section", "recent");
  const head = el("div", "recent-head");
  const history = el("button", "link", "History");
  history.addEventListener("click", () => void openTab(`${__LATESHOW__}/u/me`));
  head.append(el("p", "label", "Marked this week"), history);
  sec.append(head);
  week.forEach((r, i) => {
    const line = el("div", "mark");
    const text = el("div", "text");
    const ep = r.season != null && r.episode != null ? ` · S${r.season} E${r.episode}` : "";
    text.append(el("span", "", `${r.title}${ep}`), el("span", "sub", `${when(r.at)} · ${r.via}`));
    line.append(text);
    // Undo only for the newest, and only what that mark created
    if (i === 0 && r.ids.length) {
      const undo = el("button", "link", "Undo");
      undo.addEventListener("click", async () => {
        const res = await chrome.runtime.sendMessage<{ ok: boolean }>({ type: "lateshow:undo", ids: r.ids });
        if (!res?.ok) return;
        const all = (await store<Recent[]>("recent")) ?? [];
        await chrome.storage.local.set({ recent: all.filter((x) => x.at !== r.at) });
      });
      line.append(undo);
    }
    sec.append(line);
  });
  return sec;
}

/** Plus one: join a room by its code, then what the room did last and Leave */
function plusOneCard(code: string | undefined, status: PlusOneStatus | undefined) {
  const sec = el("section", "recent");
  const head = el("div", "recent-head");
  head.append(el("p", "label", code ? `Plus one · ${code}` : "Plus one"));
  sec.append(head);
  if (code) {
    const line = el("div", "mark");
    const text = el("div", "text");
    const last = status?.code === code && status.name ? `${status.name} ${status.playing ? "played" : "paused"}` : "";
    text.append(
      el("span", "", last || "In the room"),
      el("span", "sub", "Open the episode on Netflix, your player follows the room"),
    );
    const leave = el("button", "link", "Leave");
    leave.addEventListener("click", () => void chrome.runtime.sendMessage({ type: "lateshow:plusone-leave" }));
    line.append(text, leave);
    sec.append(line);
    return sec;
  }
  const form = el("form", "code");
  const input = Object.assign(el("input", ""), {
    placeholder: "Room code",
    maxLength: 4,
    autocomplete: "off",
    spellcheck: false,
  });
  input.setAttribute("aria-label", "Room code");
  const join = el("button", "pill", "Join");
  join.type = "submit";
  const note = el("p", "note", status?.error ?? "Watch in sync with friends. Join the room on Lateshow, then here.");
  form.append(input, join);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    join.disabled = true;
    const res = await chrome.runtime.sendMessage<{ ok: boolean; message?: string }>({
      type: "lateshow:plusone-join",
      code: input.value.trim().toUpperCase(),
    });
    join.disabled = false;
    if (!res?.ok) note.textContent = res?.message ?? "That didn't work. Try again.";
  });
  sec.append(form, note);
  return sec;
}

/** C: one line per site, when it last synced, Sync, and the switch that marks what you finish there */
function siteList(settings: Settings, synced: Record<string, number>, busy: string | null, queued: string[]) {
  const sameDay = (a: number) => new Date(a).toDateString() === new Date().toDateString();
  const time = (a: number) => new Date(a).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const sec = el("section", "sites");
  for (const s of SITES) {
    const on = settings.autoMark?.[s.site] !== false;
    const profile = settings.profiles?.[s.site];
    const line = el("div", "site");
    const text = el("div", "text");
    const at = synced[s.site];
    const last = at ? `synced ${sameDay(at) ? `today ${time(at)}` : day(at)}` : "never synced";
    const sub = el("span", "sub", profile ? `${last} · profile ${profile} · ` : last);
    if (profile) {
      // another profile marks from now on: the next one that finishes something there
      const change = el("button", "link", "change");
      change.setAttribute("aria-label", `Use another ${s.site} profile`);
      change.addEventListener("click", async () => {
        const cur = (await store<Settings>("settings")) ?? {};
        const profiles = { ...cur.profiles };
        delete profiles[s.site];
        await chrome.storage.local.set({ settings: { ...cur, profiles } });
      });
      sub.append(change);
    }
    text.append(el("span", "", s.site), sub);
    const sync = el("button", "sync-btn");
    // while one runs the others queue: a click puts it in line, the running one and a queued one can't be clicked
    const waiting = queued.includes(s.site);
    sync.append(icon(SYNC, 12), document.createTextNode(waiting ? "Queued" : "Sync"));
    sync.disabled = busy === s.site || waiting;
    sync.setAttribute("aria-label", `Sync ${s.site} history`);
    sync.addEventListener("click", () => void chrome.runtime.sendMessage({ type: "lateshow:sync", site: s.site }));
    const sw = el("button", `switch ${on ? "on" : ""}`);
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-checked", String(on));
    sw.setAttribute("aria-label", `Mark what I finish on ${s.site}`);
    sw.append(el("span", "knob"));
    sw.addEventListener("click", async () => {
      const cur = (await store<Settings>("settings")) ?? {};
      await chrome.storage.local.set({ settings: { ...cur, autoMark: { ...cur.autoMark, [s.site]: !on } } });
    });
    line.append(badge(s), text, sync, sw);
    sec.append(line);
  }
  // one switch for all sites: their watchlists come along with a sync
  const lists = settings.watchlists !== false;
  const sw = el("button", `switch ${lists ? "on" : ""}`);
  sw.setAttribute("role", "switch");
  sw.setAttribute("aria-checked", String(lists));
  sw.setAttribute("aria-label", "Bring watchlists along");
  sw.append(el("span", "knob"));
  sw.addEventListener("click", async () => {
    const cur = (await store<Settings>("settings")) ?? {};
    await chrome.storage.local.set({ settings: { ...cur, watchlists: !lists } });
  });
  const listLine = el("div", "site");
  const listText = el("div", "text");
  listText.append(
    el("span", "", "Bring watchlists along"),
    el("span", "sub", "A sync also adds what's on the site's watchlist"),
  );
  listLine.append(listText, sw);
  const opts = el("section", "sites");
  opts.append(listLine);
  const foot = el("p", "note center", "Sync reads what's new in the background. Switch: mark what you finish there.");
  return [sec, opts, foot];
}

let connectedAs: string | null | undefined;

async function render() {
  // Firefox lets you decide site access yourself: asked once, inside a click
  if (!(await chrome.permissions.contains({ origins: ORIGINS }))) {
    const allow = el("button", "primary", "Allow access");
    allow.addEventListener("click", async () => {
      // the browser's prompt doesn't always show from a popup (Zen): then say where the switches are
      const granted = await chrome.permissions.request({ origins: ORIGINS }).catch(() => false);
      if (granted) return rerender();
      app.append(
        el("p", "note", "No prompt? Turn it on by hand: about:addons, Lateshow, Permissions, then every site there."),
      );
    });
    app.replaceChildren(
      el("p", "note", "Lateshow needs access to Netflix, Prime Video, Crunchyroll and Lateshow."),
      allow,
    );
    return;
  }
  connectedAs ??= await account();
  who.replaceChildren();
  if (!connectedAs) {
    app.replaceChildren();
    return connectScreen();
  }
  who.append(el("span", "avatar", connectedAs.replace("@", "").slice(0, 1).toUpperCase()), connectedAs);

  const [settings, syncedAt, synced, state, recent, job] = await Promise.all([
    store<Settings>("settings"),
    store<Record<string, number>>("syncedAt"),
    store<Record<string, number>>("synced"),
    store<SyncState>("syncState"),
    store<Recent[]>("recent"),
    store<{ started?: number }>("job"),
  ]);
  // built aside and swapped in at once: emptying first showed a blank popup for a moment
  const out: Node[] = [];
  const running = state && (state.phase === "reading" || state.phase === "importing");
  if (state && (running || Date.now() - state.at < SHOW_DONE)) out.push(syncCard(state));
  out.push(plusOneCard(await store<string>("plusOne"), await store<PlusOneStatus>("plusOneStatus")));
  const marks = recentList(recent ?? []);
  if (marks) out.push(marks);
  // busy while a tab reads or what it read is imported (the tab is gone by then)
  const busy =
    (job && Date.now() - (job.started ?? 0) < STALE) || (state?.phase === "importing" && Date.now() - state.at < STALE)
      ? (state?.site ?? null)
      : null;
  // when it last synced, else (synced before 0.6.6) how far it had read
  out.push(...siteList(settings ?? {}, { ...synced, ...syncedAt }, busy, busy ? (state?.queued ?? []) : []));
  app.replaceChildren(...out);
}

// the sync, a mark or a switch changes storage: the popup follows, one render after another. A running sync's
// progress only updates its card (its light keeps running, nothing jumps)
let rendering = Promise.resolve();
const rerender = () => void (rendering = rendering.then(render, render));
chrome.storage.onChanged.addListener((changes) => {
  const keys = Object.keys(changes);
  const s = changes.syncState?.newValue as SyncState | undefined;
  const card = app.querySelector<HTMLElement>(".sync[data-phase]");
  if (keys.length === 1 && s && card?.dataset.phase === s.phase && ["reading", "importing"].includes(s.phase))
    return progress(card, s);
  rerender();
});
rerender();
