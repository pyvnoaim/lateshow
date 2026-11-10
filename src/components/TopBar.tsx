import { Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AccountButton } from "./AccountButton";
import { NavLinks } from "./NavLinks";
import { buttonStyles } from "./ui/button";
import { Container } from "./ui/Container";

/**
 * Navbar C: name + links left, (up next chip) + search + you right. Sits over the page so backdrops run underneath.
 * ponytail: the "up next" chip comes with the library feature (needs watch progress). Watchlist, Rooms and the profile (/u/me) land with later layers.
 * ponytail: links are hidden on phones until there's a phone menu.
 */
export function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <Container className="flex h-bar items-center gap-8">
        <Link href="/" className="text-logo font-bold tracking-tight">
          Lateshow
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" aria-label="Search" className={buttonStyles("ghost", "icon")}>
            <Search size={20} strokeWidth={1.75} aria-hidden />
          </Link>
          <Suspense fallback={<div aria-hidden className="size-8" />}>
            <AccountButton />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}
