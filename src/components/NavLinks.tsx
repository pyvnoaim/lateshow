"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/rooms", label: "Rooms" },
] as const;

export function NavLinks() {
  const path = usePathname();
  const router = useRouter();

  // "/" anywhere opens search. On /search itself the field handles it.
  useEffect(() => {
    if (path === "/search") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      router.push("/search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, router]);

  return (
    <nav aria-label="Main" className="hidden gap-6 text-label sm:flex">
      {links.map(({ href, label }) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
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
