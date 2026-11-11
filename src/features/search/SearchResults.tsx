import Link from "next/link";
import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getRegion } from "@/lib/region";
import { getGenreTitles, getTrending, searchTitles } from "@/lib/tmdb";
import { buttonStyles } from "@/components/ui/button";
import {
  filterCards,
  GENRES,
  MAX_MORE,
  PER_STEP,
  readSearch,
  searchHref,
  type SearchParams,
  type SearchState,
} from "./filters";

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
      ? await genreTitles(s, region.code, region.lang)
      : (await getTrending(s.type, 1, region.lang).catch(() => [])).slice(0, 12);
  const filtered = s.type !== "all" || s.genre !== null;
  // a full page means TMDB likely has more: offer the next 24 (in the URL, so back and links keep it)
  const more = !s.q && s.genre !== null && cards.length === s.more * PER_STEP && s.more < MAX_MORE;

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
            <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i % PER_STEP} morph={false} eager={i < 6} />
          ))}
        </PosterGrid>
      )}
      {more && (
        <div className="flex justify-center">
          <Link href={searchHref(s, { more: s.more + 1 })} scroll={false} className={buttonStyles("glass", "md")}>
            Show more
          </Link>
        </div>
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

/**
 * The first `more` steps of 24 popular titles in a genre. Each TMDB page gives 20 movies and 20 series, so step n
 * needs pages up to about n * 24 / 40, deduped (a title can sit on two pages while popularity moves).
 */
async function genreTitles(s: SearchState, country: string, lang: string) {
  if (!s.genre) return [];
  const want = s.more * PER_STEP;
  // 20 per kind and page, only the kinds this genre has (Horror has no series genre on TMDB)
  const kinds = (["movie", "tv"] as const).filter((k) => (s.type === "all" || s.type === k) && s.genre![k] !== null);
  const perPage = Math.max(kinds.length, 1) * 20;
  const pages = Math.ceil(want / perPage) + 1;
  const all = await Promise.all(
    Array.from({ length: pages }, (_, i) => getGenreTitles(s.type, s.genre!, country, lang, i + 1).catch(() => [])),
  );
  const seen = new Set<string>();
  return all
    .flat()
    .filter((c) => {
      const k = `${c.media_type}-${c.id}`;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .slice(0, want);
}
