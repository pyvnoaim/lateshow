// The popup: get access, open Prime Video's watch history, read it, show what's in it, hand it to Lateshow.
import type { ImportRow } from "@/lib/library/importing";

const PRIME = "https://www.primevideo.com";
const HISTORY = `${PRIME}/settings/watch-history`;
const ORIGINS = [`${PRIME}/*`, `${__LATESHOW__}/*`];

const app = document.getElementById("app")!;

/** One screen: a line of text (parts in `count` stand out) and at most one button. */
function show(text: (string | { count: string })[], action?: { label: string; run: () => void | Promise<void> }) {
  const p = document.createElement("p");
  for (const part of text) {
    if (typeof part === "string") p.append(part);
    else {
      const b = document.createElement("span");
      b.className = "count";
      b.textContent = part.count;
      p.append(b);
    }
  }
  app.replaceChildren(p);
  if (!action) return;
  const button = document.createElement("button");
  button.textContent = action.label;
  button.addEventListener("click", async () => {
    button.disabled = true;
    await action.run();
  });
  app.append(button);
  button.focus();
}

const n = (x: number) => x.toLocaleString("en");

type Progress = { pages: number; titles: number; oldest: string; at: number };

/** While the Prime tab reads: page, titles so far and how far back, live from the reader's storage. */
function reading() {
  show(["Reading your history, page by page. A long one takes a minute."]);
  const line = document.createElement("p");
  app.append(line);
  const paint = (p?: Progress) => {
    if (!p) return;
    line.replaceChildren();
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `Page ${n(p.pages)} · ${n(p.titles)} titles`;
    line.append(count, p.oldest ? ` · back to ${p.oldest}` : "");
  };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "progress" in changes) paint(changes.progress.newValue as Progress | undefined);
  });
  void chrome.storage.local.get("progress").then(({ progress }) => paint(progress as Progress | undefined));
}

async function preview() {
  const { pending } = await chrome.storage.local.get("pending");
  const rows = (pending as { rows?: ImportRow[] } | undefined)?.rows ?? [];
  const shows = rows.filter((r) => r.type === "tv");
  const episodes = shows.reduce((sum, r) => sum + (r.episodes?.length ?? 0), 0);
  show(
    [
      "Found ",
      { count: `${n(shows.length)} shows` },
      " with ",
      { count: `${n(episodes)} episodes` },
      " and ",
      { count: `${n(rows.length - shows.length)} films` },
      " in your Prime Video history. Lateshow matches them next, unclear ones you pick there.",
    ],
    {
      label: "Import into Lateshow",
      run: async () => {
        await chrome.tabs.create({ url: `${__LATESHOW__}/settings?import=extension#account` });
        window.close();
      },
    },
  );
}

async function main() {
  // Firefox lets you decide site access yourself: ask once, inside a click
  if (!(await chrome.permissions.contains({ origins: ORIGINS }))) {
    show(["Lateshow needs to read your Prime Video watch history and open Lateshow to import it."], {
      label: "Allow access",
      run: async () => {
        await chrome.permissions.request({ origins: ORIGINS });
        await main();
      },
    });
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith(`${HISTORY}`)) {
    show(["Open your Prime Video watch history, signed in, then open Lateshow here again."], {
      label: "Open watch history",
      run: async () => {
        if (tab?.id) await chrome.tabs.update(tab.id, { url: HISTORY });
        else await chrome.tabs.create({ url: HISTORY });
        window.close();
      },
    });
    return;
  }
  const id = tab.id;
  // reopened while it's still reading (a page reported in the last half minute): show that, a click would start over
  const { progress, pending } = await chrome.storage.local.get("progress").then(async (p) => ({
    ...p,
    ...(await chrome.storage.local.get("pending")),
  }));
  if ((progress as Progress | undefined)?.at && Date.now() - (progress as Progress).at < 30_000) {
    reading();
    chrome.storage.onChanged.addListener((changes) => {
      if ("pending" in changes && changes.pending.newValue) void preview();
    });
    return;
  }
  if (pending) {
    await preview();
    return;
  }
  show(["Reads your whole watch history from Prime Video. Nothing is changed there."], {
    label: "Read my watch history",
    run: async () => {
      reading();
      const res = await chrome.tabs
        .sendMessage<{ ok?: true; error?: string }>(id, { type: "lateshow:read-prime" })
        // the page was open before the extension: its script isn't there yet
        .catch(() => ({ error: "Reload the Prime Video page, then try again." }));
      if (res.error) show([res.error], { label: "Try again", run: main });
      else await preview();
    },
  });
}

void main();
