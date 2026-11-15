// The Lateshow card on a site's watch history page (bottom right): read, progress, what's in it, import. It stays put
// while you click around, unlike the toolbar popup, which closes on any click outside it. Its own closed shadow DOM, so
// the site's styles can't reach it and it touches nothing of the site.
import type { ImportRow } from "@/lib/library/importing";
import type { Progress } from "./reader";
import logo from "@/app/icon.svg";

type Read = (onProgress: (p: Progress) => void, since: number) => Promise<{ rows: ImportRow[]; oldest: string }>;

const CSS = `
:host { all: initial; }
.card { position: fixed; right: 24px; bottom: 24px; z-index: 2147483647; width: 320px; box-sizing: border-box;
  padding: 18px 18px 16px; border-radius: 22px; color: #eef1f6; font: 14px/1.45 "Inter Tight", system-ui, sans-serif;
  background: linear-gradient(180deg, rgba(40,44,56,.92), rgba(12,13,17,.94));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.08), 0 24px 60px -12px rgba(0,0,0,.7);
  backdrop-filter: blur(24px) saturate(1.6); }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
h2 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; display: flex; align-items: center; gap: 10px; }
h2 svg { width: 24px; height: 24px; flex-shrink: 0; }
p { margin: 0 0 14px; color: #8b8f98; text-wrap: pretty; }
.count { color: #eef1f6; font-variant-numeric: tabular-nums; }
button { font: inherit; cursor: pointer; }
.primary { width: 100%; height: 40px; border: 0; border-radius: 999px; font-weight: 600; color: #050506;
  background: linear-gradient(180deg, #f2f6fd, #a9c2ea); }
.primary:active { transform: scale(0.98); }
.text { margin-top: 10px; width: 100%; border: 0; background: none; color: #8b8f98; }
.text:hover { color: #eef1f6; }
.close { width: 28px; height: 28px; border: 0; border-radius: 999px; background: none; color: #8b8f98; font-size: 18px; }
.close:hover { color: #eef1f6; background: rgba(255,255,255,.06); }
button:focus-visible { outline: 2px solid #b4c8ea; outline-offset: 2px; }
button:disabled { opacity: .5; cursor: default; }
`;

const n = (x: number) => x.toLocaleString("en");
const plural = (x: number, one: string, many = `${one}s`) => `${n(x)} ${x === 1 ? one : many}`;

/** "7 shows with 21 episodes and 1 film", as text parts (counts stand out) */
export function summary(rows: ImportRow[]): (string | { count: string })[] {
  const shows = rows.filter((r) => r.type === "tv");
  const episodes = shows.reduce((sum, r) => sum + (r.episodes?.length ?? 0), 0);
  return [
    { count: plural(shows.length, "show") },
    " with ",
    { count: plural(episodes, "episode") },
    " and ",
    { count: plural(rows.length - shows.length, "film") },
  ];
}

const day = (ms: number) =>
  new Date(ms).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });

export function showCard(source: string, read: Read) {
  let last = 0; // the newest watch of the last import into Lateshow (ms), 0 before the first
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const card = document.createElement("section");
  card.className = "card";
  card.setAttribute("aria-label", "Lateshow");
  card.setAttribute("aria-live", "polite");
  root.append(style, card);
  document.body.append(host);

  const head = () => {
    const h = document.createElement("div");
    h.className = "head";
    const title = document.createElement("h2");
    // the logo drawn inline (our own icon.svg, built in): an image file could be blocked by the site's CSP
    const svg = new DOMParser().parseFromString(logo, "image/svg+xml").documentElement;
    svg.setAttribute("aria-hidden", "true");
    title.append(document.importNode(svg, true), "Lateshow");
    const close = document.createElement("button");
    close.className = "close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", () => host.remove());
    h.append(title, close);
    return h;
  };
  const line = (parts: (string | { count: string })[]) => {
    const p = document.createElement("p");
    for (const part of parts) {
      if (typeof part === "string") p.append(part);
      else {
        const s = document.createElement("span");
        s.className = "count";
        s.textContent = part.count;
        p.append(s);
      }
    }
    return p;
  };
  const button = (label: string, kind: "primary" | "text", run: () => void) => {
    const b = document.createElement("button");
    b.className = kind;
    b.textContent = label;
    b.addEventListener("click", run);
    return b;
  };
  const screen = (...nodes: Node[]) => card.replaceChildren(head(), ...nodes);

  const start = (since: number) => {
    screen(
      line([
        since ? "Reading what's new, page by page." : "Reading your history, page by page. A long one takes a minute.",
      ]),
    );
    read(
      (p) =>
        screen(
          line([
            { count: `Page ${n(p.pages)} · ${plural(p.titles, "title")}` },
            p.oldest ? ` · back to ${p.oldest}` : "",
          ]),
        ),
      since,
    ).then(
      ({ rows, oldest }) => done(rows, oldest, since),
      (e: unknown) =>
        screen(
          line([e instanceof Error ? e.message : String(e)]),
          button("Try again", "primary", () => start(since)),
        ),
    );
  };

  const done = (rows: ImportRow[], oldest: string, since = 0) =>
    !rows.length && since
      ? screen(
          line([`Nothing new since your last import on ${day(since)}.`]),
          button("Read everything", "text", () => start(0)),
        )
      : screen(
          line([
            "Found ",
            ...summary(rows),
            since ? `, new since ${day(since)}.` : oldest ? `, back to ${oldest}.` : ".",
            " Lateshow matches them next, unclear ones you pick there.",
          ]),
          button("Import into Lateshow", "primary", () =>
            window.open(`${__LATESHOW__}/settings?import=extension#account`, "_blank"),
          ),
          button("Read again", "text", () => start(last)),
        );

  // a finished read that wasn't imported yet: offer it. Else after an import only what's new, before one everything
  void Promise.all([chrome.storage.local.get("pending"), chrome.storage.local.get("synced")]).then(
    ([{ pending }, { synced }]) => {
      last = (synced as Record<string, number> | undefined)?.[source] ?? 0;
      const p = pending as { rows?: ImportRow[]; oldest?: string } | undefined;
      if (p?.rows?.length) done(p.rows, p.oldest ?? "");
      else if (last)
        screen(
          line([`Last import ${day(last)}. Reads only what you watched since.`]),
          button("Read new", "primary", () => start(last)),
          button("Read everything", "text", () => start(0)),
        );
      else
        screen(
          line([`Reads your whole ${source} watch history into Lateshow. Nothing is changed here.`]),
          button("Read my watch history", "primary", () => start(0)),
        );
    },
  );
}
