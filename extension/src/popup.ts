// The popup (drafts: the popup canvas). Not connected: what it does, Connect, and the sites' history pages for a first
// import by hand. Connected: a sync that runs or just ran, what was marked lately (Undo), then one line per site with
// when it last synced, Sync (background.ts reads and imports, see there) and the switch that marks what you finish.
import type { Recent, SyncState } from "./background";

// as background.ts: a sync job older than this is over (types only from there, its code must not run here)
const STALE = 5 * 60_000;

const PRIME = "https://www.primevideo.com";
const SITES = [
  { site: "Netflix", badge: "N", color: "#e50914", url: "https://www.netflix.com/settings/viewed" },
  { site: "Prime Video", badge: "pv", color: "#1a98ff", url: `${PRIME}/settings/watch-history` },
  { site: "Crunchyroll", badge: "C", color: "#f47521", url: "https://www.crunchyroll.com/history" },
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

type Settings = { autoMark?: Partial<Record<string, boolean>>; profiles?: Partial<Record<string, string>> };

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
  const b = el("span", "badge", s.badge);
  b.style.background = s.color;
  b.style.width = b.style.height = `${size}px`;
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

/** D: a sync that runs, or one that just ended */
function syncCard(s: SyncState) {
  const site = SITES.find((x) => x.site === s.site);
  const card = el("section", "sync");
  const head = el("div", "sync-head");
  if (site) head.append(badge(site, 22));
  if (s.phase === "reading" || s.phase === "importing") {
    head.append(el("span", "", `Syncing ${s.site}`));
    const bar = el("div", "bar");
    const fill = el("div", "fill");
    const share = s.phase === "importing" && s.total ? 0.5 + (0.5 * (s.done ?? 0)) / s.total : 0.15;
    fill.style.width = `${Math.round(share * 100)}%`;
    bar.append(fill);
    const line =
      s.phase === "reading"
        ? `Reading in a background tab · ${plural(s.read ?? 0, "title")}`
        : `Matching · ${(s.done ?? 0).toLocaleString("en")} of ${plural(s.total ?? 0, "title")}`;
    card.append(head, bar, el("p", "note", `${line}. You can close this.`));
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
  head.append(ok, el("span", "", `${s.site} is in sync`));
  const close = el("button", "x", "×");
  close.setAttribute("aria-label", "Hide");
  close.addEventListener("click", () => void chrome.storage.local.remove("syncState"));
  head.append(close);
  card.append(head);
  const counts = [r.episodes && plural(r.episodes, "episode"), r.films && plural(r.films, "film")].filter(Boolean);
  card.append(el("p", "big", counts.length ? `${counts.join(" · ")} new` : "Nothing new since the last sync"));
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

/** C: one line per site, when it last synced, Sync, and the switch that marks what you finish there */
function siteList(settings: Settings, synced: Record<string, number>, busy: boolean) {
  const sec = el("section", "sites");
  for (const s of SITES) {
    const on = settings.autoMark?.[s.site] !== false;
    const profile = settings.profiles?.[s.site];
    const line = el("div", "site");
    const text = el("div", "text");
    const last = synced[s.site] ? `synced ${day(synced[s.site])}` : "never synced";
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
    sync.append(icon(SYNC, 12), document.createTextNode("Sync"));
    sync.disabled = busy;
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
  const foot = el("p", "note center", "Sync reads what's new in the background. Switch: mark what you finish there.");
  return [sec, foot];
}

let connectedAs: string | null | undefined;

async function render() {
  app.replaceChildren();
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
    app.append(el("p", "note", "Lateshow needs access to Netflix, Prime Video, Crunchyroll and Lateshow."), allow);
    return;
  }
  connectedAs ??= await account();
  who.replaceChildren();
  if (!connectedAs) return connectScreen();
  who.append(el("span", "avatar", connectedAs.replace("@", "").slice(0, 1).toUpperCase()), connectedAs);

  const [settings, synced, state, recent, job] = await Promise.all([
    store<Settings>("settings"),
    store<Record<string, number>>("synced"),
    store<SyncState>("syncState"),
    store<Recent[]>("recent"),
    store<{ started?: number }>("job"),
  ]);
  const running = state && (state.phase === "reading" || state.phase === "importing");
  if (state && (running || Date.now() - state.at < SHOW_DONE)) app.append(syncCard(state));
  const marks = recentList(recent ?? []);
  if (marks) app.append(marks);
  app.append(...siteList(settings ?? {}, synced ?? {}, Boolean(job && Date.now() - (job.started ?? 0) < STALE)));
}

// the sync, a mark or a switch changes storage: the popup follows, one render after another
let rendering = Promise.resolve();
const rerender = () => void (rendering = rendering.then(render, render));
chrome.storage.onChanged.addListener(rerender);
rerender();
