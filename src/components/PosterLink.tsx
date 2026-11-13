import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";
import { img, type Card } from "@/lib/tmdb";
import { PosterActions } from "./PosterActions";
import { PosterCaption } from "./PosterCaption";
import { TmdbImage } from "./TmdbImage";

/**
 * Poster that links to its title page. With `morph` the poster grows into the title's backdrop.
 * Turn `morph` off when the same title can show twice on one screen (transition names must be unique).
 */
export function PosterLink({
  card,
  index = 0,
  morph = true,
  caption = true,
  plus = true,
  eager = false,
}: {
  card: Card;
  index?: number;
  morph?: boolean;
  /** `false` hides the "Movie · 2026 · Crime" line (the caller renders its own under the link). */
  caption?: boolean;
  /** `false` drops the watchlist + from the caption (the watchlist page has its own actions). */
  plus?: boolean;
  /** The first row on screen: loads right away, no fade. Only for grids at the top of a page. */
  eager?: boolean;
}) {
  const name = card.title ?? card.name ?? "";
  const poster = img(card.poster_path, "w500");
  const artwork = (
    <div className="relative aspect-poster lift overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
      {poster ? (
        <TmdbImage
          src={poster}
          lowSrc={img(card.poster_path, "w92")!}
          alt={name}
          sizes="(max-width: 640px) 45vw, 200px"
          eager={eager}
        />
      ) : (
        <span className="absolute inset-0 flex items-end p-3.5 text-lg font-bold tracking-tight">{name}</span>
      )}
    </div>
  );
  // The caption and the hover buttons sit outside the link: a button inside a link is invalid.
  return (
    <div
      className="group relative flex rise flex-col gap-2.5"
      style={{ animationDelay: `${Math.min(index, 12) * 80}ms` } as CSSProperties}
    >
      <Link
        href={`/title/${card.media_type}/${card.id}`}
        prefetch
        className="group flex flex-col gap-2.5 rounded-poster"
      >
        {morph ? (
          <ViewTransition name={`title-${card.media_type}-${card.id}`} share="morph" default="none">
            {artwork}
          </ViewTransition>
        ) : (
          artwork
        )}
        <span className="text-label font-medium">{name}</span>
      </Link>
      {plus && (
        // mouse and trackpad: the actions float over the poster's corner on hover and lift with it (same box, same
        // transform). Kept up while its list menu is open. Touch screens have them in the caption instead.
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden aspect-poster lift-follow pointer-fine:block">
          <div className="pointer-events-auto absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 has-aria-expanded:opacity-100">
            <PosterActions card={card} variant="overlay" />
          </div>
        </div>
      )}
      {caption && <PosterCaption card={card} plus={plus} />}
    </div>
  );
}
