"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { NavLinks } from "./NavLinks";

const TOP = 48; // the top bar is on its way out here: the island takes over, so there's never a moment with neither

/**
 * The bar, once you've scrolled past it: a compact glass island in the middle of the top edge, there in both
 * directions. Hidden (back at the top, where the full bar is) it can't be tabbed into.
 */
export function NavIsland({ upNext, account }: { upNext: ReactNode; account: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(scrollY >= TOP);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      inert={!shown}
      className={`fixed top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full p-1.5 glass transition duration-500 ease-spring motion-reduce:transition-none ${shown ? "translate-y-0 scale-100 opacity-100" : "-translate-y-6 scale-95 opacity-0"}`}
    >
      {/* every item sits in a 36 px slot with the same 6 px around: both ends are round and the same distance in */}
      <Link
        href="/"
        aria-label="Lateshow, home"
        className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-fg/8"
      >
        <span aria-hidden className="block size-8 mark-round" />
      </Link>
      <span className="px-1">
        <NavLinks />
      </span>
      <span className="flex items-center gap-1">
        {upNext}
        <Link
          href="/search"
          aria-label="Search"
          data-tip="Search"
          data-tip-key="/"
          className="flex size-9 press items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/8"
        >
          <Search size={18} strokeWidth={1.75} aria-hidden />
        </Link>
        <span className="flex h-9 min-w-9 items-center justify-center">{account}</span>
      </span>
    </div>
  );
}
