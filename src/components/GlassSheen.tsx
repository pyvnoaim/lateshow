"use client";

import { useEffect } from "react";

/**
 * Feeds the pointer position into whatever `.glass` / `.glass-tint` element is under it (--mx, --my), so the glass style can draw
 * a soft highlight that follows the pointer. One listener for the whole page. Skipped on touch screens.
 */
export function GlassSheen() {
  useEffect(() => {
    if (!matchMedia("(hover: hover)").matches) return;
    const move = (e: PointerEvent) => {
      const glass = (e.target as Element | null)?.closest?.(".glass, .glass-tint, .glass-accent, .glass-danger");
      if (!(glass instanceof HTMLElement)) return;
      const r = glass.getBoundingClientRect();
      glass.style.setProperty("--mx", `${e.clientX - r.left}px`);
      glass.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);
  return null;
}
