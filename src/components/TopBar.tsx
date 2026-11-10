import Link from "next/link";
import { Suspense } from "react";
import { AccountButton } from "./AccountButton";
import { NavLinks, NavLinksView } from "./NavLinks";
import { NavSearch } from "./NavSearch";
import { ScrollHeader } from "./ScrollHeader";
import { Container } from "./ui/Container";

/**
 * Navbar C: name + links left, search + you right. Fixed, clear over heroes, frosted glass once you scroll.
 * ponytail: the "up next" chip comes with the library feature (needs watch progress). Watchlist, Rooms and the profile (/u/me) land with later layers.
 * ponytail: links are hidden on phones until there's a phone menu.
 */
export function TopBar() {
  return (
    <ScrollHeader>
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
    </ScrollHeader>
  );
}
