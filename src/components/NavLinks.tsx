"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/rooms", label: "Rooms" },
] as const;

export function NavLinks() {
  const path = usePathname();
  return <NavLinksView path={path} />;
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
