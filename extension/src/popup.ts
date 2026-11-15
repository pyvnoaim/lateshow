// The popup: site access, the Lateshow account this browser is connected to, auto-marking per site, and the way to
// Prime Video's watch history for importing (the card there does the reading).

const PRIME = "https://www.primevideo.com";
const HISTORY = `${PRIME}/settings/watch-history`;
const ORIGINS = [`${PRIME}/*`, `${__LATESHOW_MATCH__}/*`];
const SITES = ["Prime Video"] as const;

type Settings = { autoMark?: Partial<Record<string, boolean>>; profiles?: Partial<Record<string, string>> };

const app = document.getElementById("app")!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}
function button(label: string, run: () => void | Promise<void>, cls = "") {
  const b = el("button", cls, label);
  b.addEventListener("click", async () => {
    b.disabled = true;
    await run();
    b.disabled = false;
  });
  return b;
}
const store = <T>(k: string) => chrome.storage.local.get(k).then((r) => r[k] as T | undefined);

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
    app.append(
      el("p", "", "Lateshow needs access to Prime Video and to Lateshow to import and mark what you watch."),
      button(
        "Allow access",
        async () => {
          await chrome.permissions.request({ origins: ORIGINS });
          await main();
        },
        "primary",
      ),
    );
    return;
  }

  const name = await account();
  if (!name) {
    app.append(
      el(
        "p",
        "",
        "Connect this browser to your Lateshow account, then what you finish on Prime Video is marked by itself.",
      ),
      button(
        "Connect to Lateshow",
        async () => {
          await chrome.tabs.create({ url: `${__LATESHOW__}/settings?connect=extension#account` });
          window.close();
        },
        "primary",
      ),
    );
  } else {
    const p = el("p", "", "Connected as ");
    p.append(el("span", "count", name));
    app.append(p);
    const settings = (await store<Settings>("settings")) ?? {};
    for (const site of SITES) {
      const on = settings.autoMark?.[site] !== false;
      const row = el("div", "row");
      const text = el("span", "");
      text.append(el("span", "site", site));
      const mine = settings.profiles?.[site];
      text.append(el("span", "hint", mine ? `Only for profile ${mine}` : "Marks what you finish"));
      const sw = el("button", `switch ${on ? "on" : ""}`);
      sw.setAttribute("role", "switch");
      sw.setAttribute("aria-checked", String(on));
      sw.setAttribute("aria-label", `Mark what I finish on ${site}`);
      sw.append(el("span", "knob"));
      sw.addEventListener("click", async () => {
        const s = (await store<Settings>("settings")) ?? {};
        await chrome.storage.local.set({ settings: { ...s, autoMark: { ...s.autoMark, [site]: !on } } });
        await main();
      });
      row.append(text, sw);
      app.append(row);
      if (mine)
        app.append(
          button(
            "Use another profile",
            async () => {
              const s = (await store<Settings>("settings")) ?? {};
              const profiles = { ...s.profiles };
              delete profiles[site];
              await chrome.storage.local.set({ settings: { ...s, profiles } });
              await main();
            },
            "text",
          ),
        );
    }
  }

  // importing: the card on the watch history page does it
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onHistory = tab?.url?.startsWith(HISTORY);
  app.append(
    el(
      "p",
      "foot",
      onHistory
        ? "Import your history with the Lateshow card at the bottom right of this page. Closed it? Reload the page."
        : "Import your history from Prime Video's watch history page.",
    ),
  );
  if (!onHistory)
    app.append(
      button(
        "Open watch history",
        async () => {
          if (tab?.id) await chrome.tabs.update(tab.id, { url: HISTORY });
          else await chrome.tabs.create({ url: HISTORY });
          window.close();
        },
        "text",
      ),
    );
}

void main();
