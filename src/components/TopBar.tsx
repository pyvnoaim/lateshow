import Link from "next/link";
import { Suspense } from "react";
import { AccountButton } from "./AccountButton";
import { NavLinks, NavLinksView } from "./NavLinks";
import { NavSearch } from "./NavSearch";
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
        <Suspense fallback={<NavLinksView path={null} />}>
          <NavLinks />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<div aria-hidden className="size-11" />}>
            <NavSearch />
          </Suspense>
          <Suspense fallback={<div aria-hidden className="size-8" />}>
            <AccountButton />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}
