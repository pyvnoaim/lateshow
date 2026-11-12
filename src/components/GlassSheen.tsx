"use client";

import { useEffect } from "react";

const GLASS = ".glass, .glass-tint, .glass-accent, .glass-danger";

/**
 * Feeds the pointer position into whatever `.glass` / `.glass-tint` element is under it (--mx, --my), so the glass style can draw
 * a soft highlight that follows the pointer. One listener for the whole page. Skipped on touch screens.
 */
export function GlassSheen() {
  useEffect(() => {
    if (!matchMedia("(hover: hover)").matches) return;
    const move = (e: PointerEvent) => {
      // every glass layer under the pointer, so a card's sheen keeps moving over a glass button inside it
      let glass = (e.target as Element | null)?.closest?.(GLASS);
      while (glass instanceof HTMLElement) {
        const r = glass.getBoundingClientRect();
        glass.style.setProperty("--mx", `${e.clientX - r.left}px`);
        glass.style.setProperty("--my", `${e.clientY - r.top}px`);
        glass = glass.parentElement?.closest(GLASS);
      }
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);
  return null;
}
