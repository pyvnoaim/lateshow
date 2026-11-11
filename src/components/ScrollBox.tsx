"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fade = () => {
      const top = el.scrollTop > 2;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
      el.dataset.fade = top && bottom ? "both" : top ? "top" : bottom ? "bottom" : "";
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
      <AsciiScrollbar box={ref} />
    </div>
  );
}
