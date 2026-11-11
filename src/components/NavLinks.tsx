"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// ponytail: "Rooms" comes back when watch together rooms exist.
const links = [
  { href: "/", label: "Home" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

export function NavLinks() {
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  // the watchlist lives on the profile, so that tab counts as being on "Watchlist"
  return <NavLinksView path={path === "/u/me" && tab === "watchlist" ? "/watchlist" : path} />;
}

/** The links themselves. Rendered with path null as the Suspense fallback, so nothing moves while the URL is read. */
export function NavLinksView({ path }: { path: string | null }) {
  return (
    <nav aria-label="Main" className="hidden gap-6 text-label sm:flex">
      {links.map(({ href, label }) => {
        const on = path !== null && (href === "/" ? path === "/" : path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={on ? "text-fg" : "text-muted transition-colors hover:text-fg"}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
