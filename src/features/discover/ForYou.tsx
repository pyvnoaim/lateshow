import { getSession } from "@/lib/auth";
import { getLanguage } from "@/lib/region";
import { getMyWatchedKeys, getMyWatchlistKeys, getSuggestionSeed, getTasteSeeds } from "@/lib/library/queries";
import { getTitle } from "@/lib/tmdb";
import { blend } from "./blend";
import { PosterSection } from "./PosterSection";

const MIN_SEEDS = 3; // with fewer it's just "Because you watched" again

/**
 * Titles your loved and liked ones keep pointing to: TMDB's recommendations of up to 8 of them, blended (`blend`),
 * without what you watched, have on your watchlist, or what "Because you ..." already starts from.
 */
export async function ForYou() {
  const session = await getSession();
  if (!session) return null;
  const [seeds, byw, seen, listed, lang] = await Promise.all([
    getTasteSeeds(session.user.id),
    getSuggestionSeed(session.user.id),
    getMyWatchedKeys(),
    getMyWatchlistKeys(),
    getLanguage(),
  ]);
  const used = seeds.filter((s) => !(byw && s.mediaType === byw.mediaType && s.tmdbId === byw.tmdbId));
  if (used.length < MIN_SEEDS) return null;
  const titles = await Promise.all(
    used.map((s) =>
      getTitle(s.mediaType, String(s.tmdbId), lang).then(
        (t) => ({ weight: s.value, t }),
        () => null,
      ),
    ),
  );
  const lists = titles.flatMap((x) => (x ? [{ weight: x.weight, items: x.t.recommendations.results }] : []));
  const cards = blend(lists).filter((c) => {
    const key = `${c.media_type}-${c.id}`;
    return c.poster_path && !seen?.has(key) && !listed?.has(key);
  });
  return <PosterSection title="For you" description="Where everything you loved and liked points." cards={cards} />;
}
