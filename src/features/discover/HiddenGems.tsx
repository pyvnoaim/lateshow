import { alternate, getHiddenGems } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";
import { getRegion } from "@/lib/region";
import { getMyServiceIds } from "@/lib/settings/queries";
import { getMyWatchedKeys } from "@/lib/library/queries";
import { pick } from "./pick";

/** 20 gems a day: a new shuffle of the pool every day, the same one all day, without what you've watched. */
export async function HiddenGems() {
  const [{ code, lang }, mine, seen] = await Promise.all([getRegion(), getMyServiceIds(), getMyWatchedKeys()]);
  const { movies, shows } = await getHiddenGems(code, mine, lang).catch(() => ({ movies: [], shows: [] }));
  const day = Math.floor(new Date().getTime() / 86_400_000);
  const fresh = (cards: typeof movies) =>
    pick(
      cards.filter((c) => !seen?.has(`${c.media_type}-${c.id}`)),
      10,
      day,
    );
  return (
    <PosterSection
      title="Hidden gems"
      description="Loved by the few who found them. New ones every day."
      cards={alternate(fresh(movies), fresh(shows))}
    />
  );
}
