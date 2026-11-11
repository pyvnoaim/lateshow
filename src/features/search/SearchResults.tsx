import Link from "next/link";
import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getRegion } from "@/lib/region";
import { getGenreTitles, getTrending, searchTitles } from "@/lib/tmdb";
import { filterCards, GENRES, readSearch, searchHref, type SearchParams, type SearchState } from "./filters";

/**
 * /search: with a query, results narrowed by type and genre. Without one, browse a genre:
 * popular titles you can stream in your country. State lives in the URL.
 */
export async function SearchResults({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const s = readSearch(await searchParams);
  const region = await getRegion();
  const cards = s.q
    ? filterCards(await searchTitles(s.q, region.lang), s.type, s.genre)
    : s.genre
      ? (await getGenreTitles(s.type, s.genre, region.code, region.lang).catch(() => [])).slice(0, 24)
      : (await getTrending(s.type, 1, region.lang).catch(() => [])).slice(0, 12);
  const filtered = s.type !== "all" || s.genre !== null;

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-section font-bold">
          {s.q ? <>Results for &ldquo;{s.q}&rdquo;</> : s.genre ? s.genre.label : "Browse"}
        </h1>
        {!s.q && (
          <p className="text-body text-muted">
            {s.genre
              ? `Popular on a subscription in ${region.name}.`
              : "Trending this week. Pick a genre, or type a title above."}
          </p>
        )}
        <Filters s={s} />
      </div>
      {cards.length === 0 ? (
        <p className="text-body text-muted">
          {s.q ? (
            <>
              Nothing found for &ldquo;{s.q}&rdquo;{filtered && " with these filters"}.
            </>
          ) : (
            "Nothing here right now."
          )}
          {filtered && (
            <>
              {" "}
              <Link href={searchHref(s, { type: "all", genre: null })} className="text-fg hover:underline">
                Clear filters
              </Link>
            </>
          )}
        </p>
      ) : (
        <PosterGrid>
          {cards.map((c, i) => (
            <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} morph={false} eager={i < 6} />
          ))}
        </PosterGrid>
      )}
    </>
  );
}

function Filters({ s }: { s: SearchState }) {
  return (
    <div className="flex flex-col">
      <SegmentedTabs
        label="Movies or series"
        items={(
          [
            ["all", "All"],
            ["movie", "Movies"],
            ["tv", "Series"],
          ] as const
        ).map(([type, label]) => ({ key: type, label, active: s.type === type, href: searchHref(s, { type }) }))}
      />
      <SegmentedTabs
        label="Genre"
        swipe
        items={[
          { key: "any", label: "Any genre", active: s.genre === null, href: searchHref(s, { genre: null }) },
          ...GENRES.map((g) => ({
            key: g.slug,
            label: g.label,
            active: s.genre === g,
            href: searchHref(s, { genre: g }),
          })),
        ]}
      />
    </div>
  );
}
