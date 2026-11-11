import { getSession } from "@/lib/auth";
import { getWatchlist } from "@/lib/library/queries";
import { getTitle, subscriptionServices, titleToCard } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";
import { getRegion } from "@/lib/region";

/** Watchlist titles you can stream on a subscription in your country today, the service shows as the caption icon. */
export async function WatchlistStreaming() {
  const session = await getSession();
  if (!session) return null;
  const { code, lang } = await getRegion();
  const listed = (await getWatchlist(session.user.id)).slice(0, 24);
  const titles = await Promise.all(
    listed.map(async (w) => {
      const t = await getTitle(w.mediaType, String(w.tmdbId), lang).catch(() => null);
      if (!t || subscriptionServices(t, code).length === 0) return null;
      return titleToCard(t, w.mediaType);
    }),
  );
  return (
    <PosterSection
      title="From your watchlist"
      description="Streaming now on a subscription."
      cards={titles.filter((c) => c !== null)}
    />
  );
}
