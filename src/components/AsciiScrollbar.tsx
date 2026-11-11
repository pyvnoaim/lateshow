"use client";

import { useEffect, useRef, useState } from "react";
import { thumb } from "@/lib/scrollThumb";

const CELL = 14; // px per character row (matches leading-cell)

/**
 * The page scrollbar, lettered like Resona's ASCII skin: a `:` rail with a `#` thumb down the right edge.
 * Only with a mouse or trackpad (globals.css hides the native one there), never when the page fits.
 * Drag the thumb or click the rail to jump. Decoration for pointers: keys and wheels scroll as always.
 */
export function AsciiScrollbar() {
  const [bar, setBar] = useState<{ n: number; top: number; len: number } | null>(null);
  const drag = useRef<{ y: number; scroll: number } | null>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const seen = innerHeight;
        const all = document.documentElement.scrollHeight;
        if (all <= seen + 1) return setBar(null);
        const n = Math.floor(seen / CELL);
        const [top, len] = thumb(n, seen, all, scrollY);
        setBar((b) => (b && b.n === n && b.top === top && b.len === len ? b : { n, top, len }));
      });
    };
    measure();
    addEventListener("scroll", measure, { passive: true });
    addEventListener("resize", measure);
    const ro = new ResizeObserver(measure); // content that streams in or grows changes the page height
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", measure);
      removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  if (!bar) return null;
  const ratio = () => document.documentElement.scrollHeight / innerHeight;

  return (
    <div
      aria-hidden
      onPointerDown={(e) => {
        const cell = Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / CELL);
        // on the rail: jump so the thumb centres there; on the thumb: just start dragging
        if (cell < bar.top || cell >= bar.top + bar.len) {
          scrollTo({ top: ((cell - bar.len / 2) / bar.n) * document.documentElement.scrollHeight });
        }
        drag.current = { y: e.clientY, scroll: scrollY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) scrollTo({ top: drag.current.scroll + (e.clientY - drag.current.y) * ratio() });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      className="group fixed top-0 right-0 z-30 flex w-4 cursor-default flex-col items-center font-mono text-scroll leading-cell font-bold select-none"
    >
      {Array.from({ length: bar.n }, (_, i) =>
        i >= bar.top && i < bar.top + bar.len ? (
          <span key={i} className="text-fg/40 transition-colors group-hover:text-fg/70">
            #
          </span>
        ) : (
          <span key={i} className="text-fg/12">
            :
          </span>
        ),
      )}
    </div>
  );
}
