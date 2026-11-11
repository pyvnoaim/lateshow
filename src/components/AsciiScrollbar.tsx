"use client";

import { useEffect, useRef, useState } from "react";
import { thumb } from "@/lib/scrollThumb";

const CELL = 14; // px per character row (matches leading-cell)
// Cells the thumb just left thin out back into the rail, like Kova's cursor trail (# down to the rail's :).
const TRAIL = "#*+=-:";
const LIFE = 900;
// The edge it moves onto flashes as @ (the head of Kova's trail), then settles to #.
const HEAD = 220;

/**
 * The page scrollbar, lettered like Resona's ASCII skin: a `:` rail with a `#` thumb down the right edge.
 * Only with a mouse or trackpad (globals.css hides the native one there), never when the page fits.
 * Drag the thumb or click the rail to jump. Decoration for pointers: keys and wheels scroll as always.
 */
export function AsciiScrollbar() {
  const [bar, setBar] = useState<{ n: number; top: number; len: number } | null>(null);
  const drag = useRef<{ y: number; scroll: number } | null>(null);
  // when each cell was last under the thumb, and a clock that only ticks while some cell is still fading
  const left = useRef<number[]>([]);
  const [leftAt, setLeftAt] = useState<number[]>([]); // the same, for rendering
  const entered = useRef<number[]>([]);
  const [enteredAt, setEnteredAt] = useState<number[]>([]);
  const [now, setNow] = useState(0);
  const prev = useRef<{ top: number; len: number } | null>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    const trail = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let clock = 0;
    // re-render while a trail cell is younger than LIFE, then stop (an idle page costs nothing)
    const tick = () => {
      if (clock) return;
      const loop = (t: number) => {
        setNow(t);
        const busy = left.current.some((at) => t - at < LIFE) || entered.current.some((at) => t - at < HEAD);
        clock = busy ? requestAnimationFrame(loop) : 0;
      };
      clock = requestAnimationFrame(loop);
    };
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const seen = innerHeight;
        const all = document.documentElement.scrollHeight;
        if (all <= seen + 1) return setBar(null);
        const n = Math.floor(seen / CELL);
        const [top, len] = thumb(n, seen, all, scrollY);
        const p = prev.current;
        if (p && trail && (p.top !== top || p.len !== len)) {
          const t = performance.now();
          for (let i = p.top; i < p.top + p.len; i++) if (i < top || i >= top + len) left.current[i] = t;
          for (let i = top; i < top + len; i++) if (i < p.top || i >= p.top + p.len) entered.current[i] = t;
          setLeftAt([...left.current]);
          setEnteredAt([...entered.current]);
          tick();
        }
        prev.current = { top, len };
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
      cancelAnimationFrame(clock);
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
          <Thumb key={i} age={now - (enteredAt[i] ?? -Infinity)} />
        ) : (
          <Rail key={i} age={now - (leftAt[i] ?? -Infinity)} />
        ),
      )}
    </div>
  );
}

/** A rail cell: a plain `:`, or while the thumb just left it, a character thinning from # to : as it fades. */
function Rail({ age }: { age: number }) {
  if (!(age >= 0 && age < LIFE)) return <span className="text-fg/12">:</span>;
  const life = 1 - age / LIFE;
  return (
    <span className="text-fg" style={{ opacity: 0.12 + life * 0.3 }}>
      {TRAIL[Math.min(TRAIL.length - 1, Math.floor((1 - life) * TRAIL.length))]}
    </span>
  );
}

/** A thumb cell: `#`, or for a moment after the thumb moved onto it, a brighter `@`. */
function Thumb({ age }: { age: number }) {
  const head = age >= 0 && age < HEAD;
  return (
    <span className={head ? "text-fg/75" : "text-fg/40 transition-colors group-hover:text-fg/70"}>
      {head ? "@" : "#"}
    </span>
  );
}
