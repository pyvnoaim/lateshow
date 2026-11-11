import Link from "next/link";
import { Suspense } from "react";
import { AccountButton } from "./AccountButton";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks, NavLinksView } from "./NavLinks";
import { NavSearch } from "./NavSearch";
import { UpNext } from "./UpNext";
import { Container } from "./ui/Container";
import { getSession } from "@/lib/auth";

/**
 * Navbar C: name + links left, search + you right. Sits over the page so backdrops run underneath, scrolls away.
 */
export function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <Container className="flex h-bar items-center gap-8">
        <Link href="/" aria-label="Lateshow, home" className="rounded-thumb">
          <Logo />
        </Link>
        <Suspense fallback={<NavLinksView path={null} />}>
          <NavLinks />
        </Suspense>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          {/* your show in progress, as a small pill (it used to take over Home's hero) */}
          <Suspense>
            <UpNext />
          </Suspense>
          <Suspense fallback={<div aria-hidden className="size-11" />}>
            <NavSearch />
          </Suspense>
          {/* phones reach the profile (or sign in) from the menu, so search gets the room */}
          <div className="hidden sm:flex">
            <Suspense fallback={<div aria-hidden className="size-8" />}>
              <AccountButton />
            </Suspense>
          </div>
          <Suspense fallback={<div aria-hidden className="size-11 sm:hidden" />}>
            <PhoneMenu />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

async function PhoneMenu() {
  return <MobileMenu signedIn={(await getSession()) !== null} />;
}
