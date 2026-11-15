// The small glass toast at the bottom left of a playing video: "Marked as watched · Undo", "Which one did you just
// watch?" and the rest. Its own closed shadow DOM (the site's styles can't reach it), inside the fullscreen element
// when the video is fullscreen. Nothing in it is built from HTML, only text.

const CSS = `
:host { all: initial; }
.t { position: fixed; left: 32px; bottom: 96px; z-index: 2147483647; box-sizing: border-box; max-width: 360px;
  color: #eef1f6; font: 14px/1.4 "Inter Tight", system-ui, sans-serif; border-radius: 22px; padding: 12px 14px;
  background: linear-gradient(180deg, rgba(40,44,56,.9), rgba(12,13,17,.93));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.08), 0 20px 50px -12px rgba(0,0,0,.7);
  backdrop-filter: blur(24px) saturate(1.6); animation: rise .35s cubic-bezier(.2,.8,.2,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
.row { display: flex; align-items: center; gap: 12px; }
.title { font-weight: 600; }
.meta { color: #a3a8b3; font-size: 13px; font-variant-numeric: tabular-nums; }
button { font: inherit; cursor: pointer; border: 0; color: #eef1f6; }
.undo { margin-left: auto; background: none; font-weight: 600; padding: 8px 12px; border-radius: 999px; }
.undo:hover, .pick:hover { background: rgba(255,255,255,.09); }
.pick { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: rgba(255,255,255,.04);
  padding: 6px; border-radius: 14px; margin-top: 6px; }
.pick img, .pick .ph { width: 32px; height: 48px; border-radius: 6px; object-fit: cover; background: #23262e; flex-shrink: 0; }
.quiet { background: none; color: #a3a8b3; padding: 8px 4px; }
.quiet:hover { color: #eef1f6; }
.foot { display: flex; justify-content: space-between; margin-top: 4px; }
button:focus-visible { outline: 2px solid #b4c8ea; outline-offset: 2px; }
`;

export type Choice = { label: string; meta: string; image: string | null; run: () => void };

let current: { host: HTMLElement; timer: number } | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = "") {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

/** Shows one toast (a new one replaces the last). `hideAfter` ms, 0 = until a choice is made. */
export function toast(
  parts: { title: string; meta?: string; undo?: () => void; choices?: Choice[]; foot?: Choice[] },
  hideAfter = 8000,
) {
  close();
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = CSS;
  const box = el("div", "t");
  box.setAttribute("role", "status");
  const row = el("div", "row");
  const text = el("div", "");
  text.append(el("div", "title", parts.title));
  if (parts.meta) text.append(el("div", "meta", parts.meta));
  row.append(text);
  if (parts.undo) {
    const undo = parts.undo;
    const b = el("button", "undo", "Undo");
    b.addEventListener("click", () => undo());
    row.append(b);
  }
  box.append(row);
  for (const c of parts.choices ?? []) {
    const b = el("button", "pick");
    // the site may not allow images from elsewhere (its CSP): then the grey placeholder
    const pic = c.image ? Object.assign(document.createElement("img"), { src: c.image, alt: "" }) : el("span", "ph");
    pic.addEventListener("error", () => pic.replaceWith(el("span", "ph")));
    const label = el("span", "");
    label.append(el("div", "title", c.label), el("div", "meta", c.meta));
    b.append(pic, label);
    b.addEventListener("click", () => c.run());
    box.append(b);
  }
  if (parts.foot?.length) {
    const foot = el("div", "foot");
    for (const c of parts.foot) {
      const b = el("button", "quiet", c.label);
      b.addEventListener("click", () => c.run());
      foot.append(b);
    }
    box.append(foot);
  }
  root.append(style, box);
  // fullscreen video: only the fullscreen element shows, so the toast goes inside it. A player frame in fullscreen
  // (Crunchyroll) can't hold it: then it waits on the page and shows once you leave fullscreen.
  // ponytail: showing it inside the frame would need the frame script to draw it
  const full = document.fullscreenElement;
  (full && full.tagName !== "IFRAME" ? full : document.body).append(host);
  current = { host, timer: hideAfter ? window.setTimeout(close, hideAfter) : 0 };
}

export function close() {
  if (!current) return;
  clearTimeout(current.timer);
  current.host.remove();
  current = null;
}
