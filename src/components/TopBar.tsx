import { Search } from "lucide-react";
import Link from "next/link";
import { NavLinks } from "./NavLinks";

/**
 * Navbar C: name + links left, (up next chip) + search + you right. Sits over the page so backdrops run underneath.
 * ponytail: the "up next" chip comes with the library feature (needs watch progress). Watchlist, Rooms, /u/me land with later layers.
 * ponytail: links are hidden on phones until there's a phone menu.
 */
export function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-[88px] max-w-[1280px] items-center gap-8 px-4 sm:px-12">
        <Link href="/" className="text-[22px] font-bold tracking-[-0.035em]">Lateshow</Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" aria-label="Search" className="press flex size-11 items-center justify-center rounded-full transition-colors hover:bg-fg/10">
            <Search size={20} strokeWidth={1.75} aria-hidden />
          </Link>
          <Link href="/u/me" aria-label="Your profile" className="press flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-bg">
            A
          </Link>
        </div>
      </div>
    </header>
  );
}
