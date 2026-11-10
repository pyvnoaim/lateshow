import { getSession } from "@/lib/auth";
import { getWatchlist } from "@/lib/library/queries";
import { getTitle, subscriptionServices, type Card } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";
import { getRegion } from "@/lib/region";

/** Watchlist titles you can stream on a subscription in your country today, with the service as caption. */
export async function WatchlistStreaming() {
  const session = await getSession();
  if (!session) return null;
  const { code } = await getRegion();
  const listed = (await getWatchlist(session.user.id)).slice(0, 24);
  const titles = await Promise.all(
    listed.map(async (w) => {
      const t = await getTitle(w.mediaType, String(w.tmdbId)).catch(() => null);
      const services = t ? subscriptionServices(t, code) : [];
      if (!t || services.length === 0) return null;
      const card: Card = {
        id: t.id,
        media_type: w.mediaType,
        title: t.title,
        name: t.name,
        poster_path: t.poster_path,
      };
      return { card, service: services[0] };
    }),
  );
  const streaming = titles.filter((x) => x !== null);
  const serviceOf = new Map(streaming.map((x) => [`${x.card.media_type}-${x.card.id}`, x.service]));
  return (
    <PosterSection
      title="From your watchlist"
      description="Streaming now on a subscription."
      cards={streaming.map((x) => x.card)}
      service={(c) => serviceOf.get(`${c.media_type}-${c.id}`)}
    />
  );
}
