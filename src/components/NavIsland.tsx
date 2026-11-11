"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { NavLinks } from "./NavLinks";

const TOP = 160; // below this the full top bar is in view, no island needed

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
      className={`fixed top-3 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-5 rounded-full pr-2 pl-4 glass transition duration-300 ease-out motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"}`}
    >
      <Link href="/" aria-label="Lateshow, home" className="flex shrink-0 rounded-thumb">
        <Image src="/icon.svg" alt="" width={24} height={24} unoptimized />
      </Link>
      <NavLinks />
      <span className="flex items-center gap-1.5">
        {upNext}
        <Link
          href="/search"
          aria-label="Search"
          data-tip="Search"
          data-tip-key="/"
          className="flex size-10 press items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/8"
        >
          <Search size={18} strokeWidth={1.75} aria-hidden />
        </Link>
        {account}
      </span>
    </div>
  );
}
