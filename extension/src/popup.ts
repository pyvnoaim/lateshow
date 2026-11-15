// The popup: get site access once, and the way to Prime Video's watch history. Reading and importing happen in the
// card on that page (card.ts), which doesn't close when you click elsewhere.

const PRIME = "https://www.primevideo.com";
const HISTORY = `${PRIME}/settings/watch-history`;
const ORIGINS = [`${PRIME}/*`, `${__LATESHOW_MATCH__}/*`];

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
  // on the history page the card there does the rest: it stays while you click around, this popup doesn't
  show([
    "Use the Lateshow card at the bottom right of this page. It keeps going while you click around. Closed it? Reload the page.",
  ]);
}

void main();
