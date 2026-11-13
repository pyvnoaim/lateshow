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

/**
 * The hover version of a poster's actions, laid over its corner. Put it next to the poster's link (a button inside a
 * link is invalid), inside a `group relative` wrapper whose top is the poster. Same box and transform as the poster's
 * `lift`, so it moves with it. Kept up while its list menu is open. Mouse and trackpad only, touch has the caption.
 */
export function PosterHoverActions({ card }: { card: Card }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 hidden aspect-poster lift-follow pointer-fine:block">
      <div className="pointer-events-auto absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 has-aria-expanded:opacity-100">
        <PosterActions card={card} variant="overlay" />
      </div>
    </div>
  );
}
