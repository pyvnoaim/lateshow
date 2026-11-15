// The popup: site access, the Lateshow account this browser is connected to (status under the name), then one row per
// thing you can do: mark what you finish (a switch, or Connect), import your history (opens the watch history page,
// where the card does the reading).

const PRIME = "https://www.primevideo.com";
// the sites that mark what you finish
const MARKING = ["Crunchyroll", "Netflix", "Prime Video"];
// where each site keeps your history, the card on that page reads it
const HISTORIES = [
  { site: "Prime Video", url: `${PRIME}/settings/watch-history` },
  { site: "Crunchyroll", url: "https://www.crunchyroll.com/history" },
  { site: "Netflix", url: "https://www.netflix.com/settings/viewed" },
];
const ORIGINS = [
  `${PRIME}/*`,
  "https://www.crunchyroll.com/*",
  "https://static.crunchyroll.com/*", // Crunchyroll's player frame, where the video plays
  "https://www.netflix.com/*",
  `${__LATESHOW_MATCH__}/*`,
];

type Settings = { autoMark?: Partial<Record<string, boolean>>; profiles?: Partial<Record<string, string>> };

const app = document.getElementById("app")!;
const statusLine = document.getElementById("status")!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}
const store = <T>(k: string) => chrome.storage.local.get(k).then((r) => r[k] as T | undefined);

// stroke icons (lucide's shapes), built as SVG nodes, never from HTML
function icon(paths: string[], size = 18) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [k, v] of Object.entries({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
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
const CHECK = ["M21.8 10A10 10 0 1 1 17 3.3", "m9 11 3 3L22 4"];
const IMPORT = ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"];
const CHEVRON = ["m9 18 6-6-6-6"];

/** One row: icon, title, hint, then its action at the end. A whole-row action makes the row a button. */
function row(paths: string[], title: string, hint: string, end?: Node, onRow?: () => void) {
  const r = el(onRow ? "button" : "div", "row");
  const ic = el("span", "icon");
  ic.append(icon(paths));
  const text = el("span", "text");
  text.append(el("span", "title", title), el("span", "hint", hint));
  r.append(ic, text);
  if (end) r.append(end);
  if (onRow) r.addEventListener("click", onRow);
  return r;
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

async function main() {
  app.replaceChildren();
  // Firefox lets you decide site access yourself: asked once, inside a click
  if (!(await chrome.permissions.contains({ origins: ORIGINS }))) {
    statusLine.textContent = "Needs access first";
    const allow = el("button", "primary", "Allow access");
    allow.addEventListener("click", async () => {
      // the browser's prompt doesn't always show from a popup (Zen): then say where the switches are
      const granted = await chrome.permissions.request({ origins: ORIGINS }).catch(() => false);
      if (granted) return main();
      app.append(
        el(
          "p",
          "",
          "No prompt? Turn it on by hand: about:addons, Lateshow, Permissions, then switch on every site there.",
        ),
      );
    });
    app.append(
      el("p", "", "To import from Prime Video, Crunchyroll and Netflix and to talk to your Lateshow account."),
      allow,
    );
    return;
  }

  const name = await account();
  statusLine.replaceChildren();
  if (name) {
    statusLine.append("Connected as ");
    statusLine.append(el("b", "", name));
  } else statusLine.textContent = "Not connected";

  // mark what you finish: a switch once connected, else Connect
  if (name) {
    const settings = (await store<Settings>("settings")) ?? {};
    for (const SITE of MARKING) {
      const on = settings.autoMark?.[SITE] !== false;
      const mine = settings.profiles?.[SITE];
      const sw = el("button", `switch ${on ? "on" : ""}`);
      sw.setAttribute("role", "switch");
      sw.setAttribute("aria-checked", String(on));
      sw.setAttribute("aria-label", `Mark what I finish on ${SITE}`);
      sw.append(el("span", "knob"));
      sw.addEventListener("click", async () => {
        const s = (await store<Settings>("settings")) ?? {};
        await chrome.storage.local.set({ settings: { ...s, autoMark: { ...s.autoMark, [SITE]: !on } } });
        await main();
      });
      app.append(row(CHECK, `Mark on ${SITE}`, mine ? `Profile ${mine}` : "What you finish, with the real time", sw));
      if (mine) {
        const other = el("button", "link", `Use another ${SITE} profile`);
        other.addEventListener("click", async () => {
          const s = (await store<Settings>("settings")) ?? {};
          const profiles = { ...s.profiles };
          delete profiles[SITE];
          await chrome.storage.local.set({ settings: { ...s, profiles } });
          await main();
        });
        const line = el("p", "");
        line.append(other);
        app.append(line);
      }
    }
  } else {
    const connect = el("button", "pill", "Connect");
    connect.addEventListener("click", async () => {
      await chrome.tabs.create({ url: `${__LATESHOW__}/settings?connect=extension#account` });
      window.close();
    });
    app.append(row(CHECK, "Mark what I finish", "Connect this browser to your account", connect));
  }

  // import: the card on each site's history page does the reading
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const h of HISTORIES) {
    if (tab?.url?.startsWith(h.url)) {
      app.append(
        row(IMPORT, `Import from ${h.site}`, "Use the Lateshow card at the bottom right. Closed it? Reload the page."),
      );
      continue;
    }
    const chevron = el("span", "chevron");
    chevron.append(icon(CHEVRON, 16));
    app.append(
      row(IMPORT, `Import from ${h.site}`, "Opens your watch history there", chevron, async () => {
        if (tab?.id) await chrome.tabs.update(tab.id, { url: h.url });
        else await chrome.tabs.create({ url: h.url });
        window.close();
      }),
    );
  }
}

void main();
