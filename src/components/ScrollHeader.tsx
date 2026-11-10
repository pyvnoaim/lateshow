"use client";

import { useEffect, useState, type ReactNode } from "react";

const SCROLLED_AT = 24; // px

/**
 * Fixed top bar that stays clear over heroes and turns into frosted glass once you scroll.
 * The glass is its own layer that fades in (animating backdrop blur directly stutters).
 */
export function ScrollHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLLED_AT);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div
        aria-hidden
        className={`absolute inset-0 bar-glass transition-opacity duration-300 ease-out ${scrolled ? "opacity-100" : "opacity-0"}`}
      />
      <div className="relative">{children}</div>
    </header>
  );
}
