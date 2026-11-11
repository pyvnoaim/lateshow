import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getRegion } from "@/lib/region";
import { Container } from "./ui/Container";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/", label: "Home" },
      { href: "/cinemas", label: "Coming to cinemas" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "You",
    links: [
      { href: "/watchlist", label: "Watchlist" },
      { href: "/u/me", label: "Profile" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    title: "Lateshow",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/impressum", label: "Impressum" },
    ],
  },
];

/** Quiet footer on every main page: name and tagline, three link columns, data credit and the detected country. */
export function Footer() {
  return (
    <footer className="mt-section border-t border-hairline">
      <Container className="flex flex-col gap-12 pt-14 pb-10">
        {/* baseline: the name and the column headings sit on one line */}
        <div className="flex flex-wrap items-baseline justify-between gap-12">
          <div className="flex flex-col gap-2">
            <Link href="/" className="w-fit text-logo font-bold tracking-tight">
              Lateshow
            </Link>
            <p className="text-small text-muted">Everything you watch. One place.</p>
          </div>
          {/* columns as wide as their links, so the last one ends flush with the right edge like the line below */}
          <nav aria-label="Footer" className="flex flex-wrap gap-x-16 gap-y-8">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="text-caption font-semibold text-fg">{col.title}</span>
                {col.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="w-fit text-small text-muted transition-colors hover:text-fg"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-x-8 gap-y-2 text-caption text-muted">
          <Suspense fallback={<span>Lateshow</span>}>
            <Bottom />
          </Suspense>
        </div>
      </Container>
    </footer>
  );
}

// Per request (country from the request), so it sits in its own Suspense.
async function Bottom() {
  await connection(); // the year comes from the clock, which Next must not prerender
  const { name } = await getRegion();
  return (
    <>
      <span className="nums">© {new Date().getFullYear()} Lateshow</span>
      <span>Data from TMDB and JustWatch · Streaming info for {name}</span>
    </>
  );
}
