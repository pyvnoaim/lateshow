import { getMyWatchlistKeys } from "@/lib/library/queries";
import { createList, setInList } from "@/lib/lists/actions";
import { getMyListMembership } from "@/lib/lists/queries";
import type { Card } from "@/lib/tmdb";
import { ListMenu } from "./library/ListMenu";
import { WatchlistPlus } from "./library/WatchlistPlus";

/**
 * A poster's actions, signed in: the list icon (once you have a list) and the watchlist +. `caption`: quiet icons at
 * the end of the caption line (touch screens). `overlay`: small glass buttons over the poster's corner, shown on
 * hover (mouse and trackpad). Both read the same per-request data, so rendering both costs no extra queries.
 */
export async function PosterActions({ card, variant }: { card: Card; variant: "caption" | "overlay" }) {
  const [listed, mine] = await Promise.all([getMyWatchlistKeys(), getMyListMembership()]);
  if (!listed) return null;
  const key = `${card.media_type}-${card.id}`;
  const ref = {
    type: card.media_type,
    tmdbId: card.id,
    title: card.title ?? card.name ?? "",
    posterPath: card.poster_path,
  };
  return (
    <>
      {mine && mine.lists.length > 0 && (
        <ListMenu
          size={variant}
          name={ref.title}
          lists={mine.lists.map((l) => ({ ...l, has: mine.on.get(key)?.has(l.id) ?? false }))}
          toggle={setInList.bind(null, ref)}
          create={createList.bind(null, ref)}
        />
      )}
      <WatchlistPlus titleRef={ref} initial={listed.has(key)} variant={variant} />
    </>
  );
}
