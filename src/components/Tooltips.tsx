"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Tip = { text: string; meta?: string; keyCap?: string; anchor: DOMRect };

const DELAY_MS = 350; // before the first tooltip
const WARM_MS = 600; // moving to another tip within this time shows it at once
const GAP = 10;
const EDGE = 8;

/**
 * One tooltip for the whole site. Any element with `data-tip="Text"` (optional `data-tip-meta="grey line"`, `data-tip-key="/"` for a shortcut)
 * gets a small glass tooltip above it, on hover and on keyboard focus. One listener, so a grid with hundreds of
 * squares costs nothing. Flips below near the top of the window, never leaves the window.
 */
export function Tooltips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let warmUntil = 0;
    let current: Element | null = null;
    let visible = false;

    const show = (el: HTMLElement) => {
      const text = el.dataset.tip;
      if (!text) return;
      current = el;
      clearTimeout(showTimer);
      const open = () => {
        visible = true;
        setTip({ text, meta: el.dataset.tipMeta, keyCap: el.dataset.tipKey, anchor: el.getBoundingClientRect() });
      };
      // one already showing (moving along a grid) or just closed: switch at once, no second delay
      if (visible || Date.now() < warmUntil) open();
      else showTimer = setTimeout(open, DELAY_MS);
    };
    const hide = () => {
      clearTimeout(showTimer);
      if (visible) warmUntil = Date.now() + WARM_MS;
      visible = false;
      current = null;
      setTip(null);
    };
    const find = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>("[data-tip]") : null);

    const over = (e: Event) => {
      const el = find(e.target);
      if (el && el !== current) show(el);
      else if (!el && current) hide();
    };
    const focus = (e: FocusEvent) => {
      const el = find(e.target);
      if (el) show(el);
    };

    document.addEventListener("pointerover", over);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerdown", hide);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => {
      clearTimeout(showTimer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("pointerdown", hide);
      window.removeEventListener("scroll", hide, { capture: true });
    };
  }, []);

  // Place it once its size is known: centered above the element, below when there's no room, inside the window.
  useLayoutEffect(() => {
    if (!tip || !box.current) return setPos(null);
    const { width, height } = box.current.getBoundingClientRect();
    const a = tip.anchor;
    const below = a.top - height - GAP < EDGE;
    const left = Math.min(Math.max(a.left + a.width / 2 - width / 2, EDGE), window.innerWidth - width - EDGE);
    setPos({ left, top: below ? a.bottom + GAP : a.top - height - GAP, below });
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={box}
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
      className={`pointer-events-none fixed z-50 max-w-xs rounded-thumb px-3 py-2 text-caption glass ${pos ? (pos.below ? "tip-in-below" : "tip-in") : ""}`}
    >
      <div className="flex items-center gap-2 font-medium text-fg">
        {tip.text}
        {/* data-tip-key: the keyboard shortcut as a small key cap on the same line ("Search /") */}
        {tip.keyCap && (
          <kbd className="rounded-sm glass-cell px-1.5 font-mono text-badge leading-relaxed text-fg/80">
            {tip.keyCap}
          </kbd>
        )}
      </div>
      {tip.meta && <div className="text-fg/70 nums">{tip.meta}</div>}
    </div>
  );
}
