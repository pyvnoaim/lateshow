import { getSession } from "@/lib/auth";
import { getLanguage } from "@/lib/region";
import { getSuggestionSeed, getWatchedTitleKeys } from "@/lib/library/queries";
import { getTitle } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";

/** TMDB recommendations for a title you loved lately or the last thing you watched, without what you've seen. */
export async function BecauseYouWatched() {
  const session = await getSession();
  if (!session) return null;
  const [last, seen] = await Promise.all([getSuggestionSeed(session.user.id), getWatchedTitleKeys(session.user.id)]);
  if (!last) return null;
  const t = await getTitle(last.mediaType, String(last.tmdbId), await getLanguage()).catch(() => null);
  if (!t) return null;
  const cards = t.recommendations.results.filter((c) => !seen.has(`${c.media_type}-${c.id}`) && c.poster_path);
  return <PosterSection title={`Because you ${last.loved ? "loved" : "watched"} ${last.title}`} cards={cards} />;
}
