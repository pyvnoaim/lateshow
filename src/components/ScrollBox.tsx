"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AsciiScrollbar } from "./AsciiScrollbar";

/**
 * A box that scrolls inside a fixed height (episodes, ratings): the rows fade out softly only on the side where
 * there's more, and the page's ASCII scrollbar runs down its right edge. `boxRef` reaches the scrolling element.
 */
export function ScrollBox({
  className = "",
  boxRef,
  children,
}: {
  className?: string;
  boxRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const own = useRef<HTMLDivElement>(null);
  const ref = boxRef ?? own;
  const [fade, setFade] = useState({ top: false, bottom: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fade = () => {
      const top = el.scrollTop > 2;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
      setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
    };
    fade();
    el.addEventListener("scroll", fade, { passive: true });
    const ro = new ResizeObserver(fade);
    ro.observe(el);
    const mo = new MutationObserver(fade);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", fade);
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref]);
  return (
    <div className="relative">
      <div ref={ref} className={`relative scroll-box pr-5 ${className}`}>
        {children}
      </div>
      {/* the rows fade into the page where there's more to scroll: overlays in the page colour, the same in every browser */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-22 bg-linear-to-b from-bg to-transparent transition-opacity duration-300 ${fade.top ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-22 bg-linear-to-t from-bg to-transparent transition-opacity duration-300 ${fade.bottom ? "opacity-100" : "opacity-0"}`}
      />
      <AsciiScrollbar box={ref} />
    </div>
  );
}
