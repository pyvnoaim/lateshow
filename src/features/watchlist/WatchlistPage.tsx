import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FriendFaces } from "@/components/friends/FriendFaces";
import { PosterLink } from "@/components/PosterLink";
import { buttonStyles } from "@/components/ui/button";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getSession } from "@/lib/auth";
import { findToAdd, setOnWatchlist, setWatched, type AddResult } from "@/lib/library/actions";
import { SORTS, sortShelf, type Sort } from "@/lib/library/shelves";
import { getWatchlistView, type WatchlistItem } from "@/lib/library/watchlistView";
import { getRegion } from "@/lib/region";
import { img } from "@/lib/tmdb";
import { AddTitle } from "./components/AddTitle";
import { ItemActions } from "./components/ItemActions";
import { PickOne } from "./components/PickOne";

type Params = { type?: string | string[]; genre?: string | string[]; sort?: string | string[] };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORT_LABELS: Record<Sort, string> = {
  leaving: "Leaving soon",
  added: "Recently added",
  rating: "Rating",
  shortest: "Shortest",
};

async function addFromSearch(r: AddResult) {
  "use server";
  await setOnWatchlist(
    {
      type: r.type,
      tmdbId: r.id,
      title: r.title,
      posterPath: r.posterPath,
    },
    true,
  );
}

/** /watchlist: your list sorted by what you can do with it tonight. Filters live in the URL. */
export async function WatchlistPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/watchlist")}`);
  const p = await searchParams;
  const { code, name: country, lang } = await getRegion();
  const all = await getWatchlistView(session.user.id, code, lang);

  const kind = one(p.type) === "movie" ? "movie" : one(p.type) === "series" ? "tv" : "all";
  const genre = one(p.genre) ?? null;
  const sort: Sort = SORTS.find((s) => s === one(p.sort)) ?? "leaving";
  const href = (patch: Partial<{ type: string | null; genre: string | null; sort: string | null }>) => {
    const next = { type: one(p.type) ?? null, genre, sort: one(p.sort) ?? null, ...patch };
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return q ? `/watchlist?${q}` : "/watchlist";
  };

  const byKind = all.filter((i) => kind === "all" || i.type === kind);
  const counts = new Map<string, number>();
  for (const i of byKind) if (i.genre) counts.set(i.genre, (counts.get(i.genre) ?? 0) + 1);
  const shown = byKind.filter((i) => !genre || i.genre === genre);
  const shelf = (s: WatchlistItem["shelf"]) => shown.filter((i) => i.shelf === s);
  const now = sortShelf(shelf("now"), sort);
  const coming = shelf("coming").toSorted((a, b) => (a.note ?? "").localeCompare(b.note ?? ""));
  const rent = shelf("rent");
  const nowhere = shelf("nowhere");

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-start gap-8">
        <h1 className="text-page leading-none font-bold">
          Nothing saved yet.
          <br />
          <span className="text-muted">Tap + on anything you want to watch.</span>
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className={buttonStyles("primary", "md")}>
            See what&apos;s trending
          </Link>
          <AddTitle find={findToAdd} add={addFromSearch} />
        </div>
      </div>
    );
  }

  const card = (i: WatchlistItem, index: number, extra?: ReactNode) => (
    <div key={`${i.type}-${i.tmdbId}`} className="flex min-w-0 flex-col gap-2">
      <PosterLink card={i.card} index={index} morph={false} plus={false} />
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {extra}
          {i.friends.length > 0 && <FriendFaces names={i.friends} text={`${i.friends.join(", ")} too`} />}
        </div>
        <ItemActions
          titleRef={{ type: i.type, tmdbId: i.tmdbId, title: i.title, posterPath: i.posterPath }}
          minutes={i.minutes}
          watched={i.type === "movie" && i.shelf !== "coming" ? setWatched : null}
          remove={setOnWatchlist}
        />
      </div>
    </div>
  );
  const heading = (title: string, detail: string, aside?: ReactNode) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <div className="flex items-baseline gap-4">
        <h2 className="text-section leading-none font-bold">{title}</h2>
        <span className="text-small text-muted">{detail}</span>
      </div>
      {aside}
    </div>
  );

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="rise text-page leading-none font-bold">
            Your watchlist.
            <br />
            <span className="text-muted">
              {all.length} titles · {all.filter((i) => i.shelf === "now").length} on your services.
            </span>
          </h1>
          <SegmentedTabs
            label="Movies or series"
            items={[
              ["all", "All", null],
              ["movie", "Movies", "movie"],
              ["tv", "Series", "series"],
            ].map(([key, label, value]) => ({
              key: key!,
              label: label!,
              active: kind === key,
              href: href({ type: value, genre: null }),
            }))}
          />
          {counts.size > 1 && (
            <SegmentedTabs
              label="Genre"
              swipe
              items={[
                { key: "any", label: "Any genre", active: !genre, href: href({ genre: null }) },
                ...[...counts.entries()]
                  .toSorted((a, b) => b[1] - a[1])
                  .map(([g, n]) => ({ key: g, label: `${g} ${n}`, active: genre === g, href: href({ genre: g }) })),
              ]}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <AddTitle find={findToAdd} add={addFromSearch} />
          <PickOne
            items={now.map((i) => ({
              key: `${i.type}-${i.tmdbId}`,
              title: i.title,
              meta: [i.type === "movie" ? "Movie" : "Series", i.genre].filter(Boolean).join(" · "),
              poster: img(i.posterPath, "w185"),
              on: i.on!.name,
              url: i.on?.url,
            }))}
          />
        </div>
      </div>

      {now.length > 0 && (
        <section className="flex flex-col gap-6">
          {heading(
            "Watch now",
            "On your services",
            <SegmentedTabs
              label="Sort"
              items={SORTS.map((s) => ({
                key: s,
                label: SORT_LABELS[s],
                active: sort === s,
                href: href({ sort: s === "leaving" ? null : s }),
              }))}
            />,
          )}
          <PosterGrid>
            {now.map((i, n) =>
              card(
                i,
                n,
                <>
                  {i.leavesIn !== null && i.leavesIn <= 30 && (
                    <span className="text-caption text-accent nums">
                      {i.leavesIn === 0 ? "Leaves today" : `Leaves in ${i.leavesIn} day${i.leavesIn === 1 ? "" : "s"}`}
                    </span>
                  )}
                  {i.note && <span className="text-caption text-accent">{i.note}</span>}
                </>,
              ),
            )}
          </PosterGrid>
        </section>
      )}

      {coming.length > 0 && (
        <section className="flex flex-col gap-6">
          {heading("Coming up", "Not out yet")}
          <PosterGrid>
            {coming.map((i, n) => card(i, n, <span className="text-caption text-accent">{i.note}</span>))}
          </PosterGrid>
        </section>
      )}

      {rent.length > 0 && (
        <section className="flex flex-col gap-6">
          {heading("On other services", "Not on yours, or to rent or buy")}
          <PosterGrid>
            {rent.map((i, n) => card(i, n, <span className="truncate text-caption text-muted">{i.rentOn}</span>))}
          </PosterGrid>
        </section>
      )}

      {nowhere.length > 0 && (
        <details className="group flex flex-col gap-6">
          <summary className="flex w-fit cursor-pointer list-none items-baseline gap-4">
            <h2 className="text-section leading-none font-bold">Not streaming here</h2>
            <span className="text-small text-muted">
              {nowhere.length} title{nowhere.length === 1 ? "" : "s"} · not in {country} right now
            </span>
            <ChevronRight size={18} aria-hidden className="text-muted transition-transform group-open:rotate-90" />
          </summary>
          <div className="pt-6">
            <PosterGrid>{nowhere.map((i, n) => card(i, n))}</PosterGrid>
          </div>
        </details>
      )}

      {shown.length === 0 && <p className="text-body text-muted">Nothing here with these filters.</p>}
    </div>
  );
}
