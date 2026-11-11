import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";
import { img, type Card } from "@/lib/tmdb";
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
}: {
  card: Card;
  index?: number;
  morph?: boolean;
  /** `false` hides the "Movie · 2026 · Crime" line (the caller renders its own under the link). */
  caption?: boolean;
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
        />
      ) : (
        <span className="absolute inset-0 flex items-end p-3.5 text-lg font-bold tracking-tight">{name}</span>
      )}
    </div>
  );
  return (
    <Link
      href={`/title/${card.media_type}/${card.id}`}
      prefetch
      className="group flex rise flex-col gap-2.5 rounded-poster"
      style={{ animationDelay: `${Math.min(index, 12) * 80}ms` } as CSSProperties}
    >
      {morph ? (
        <ViewTransition name={`title-${card.media_type}-${card.id}`} share="morph" default="none">
          {artwork}
        </ViewTransition>
      ) : (
        artwork
      )}
      <span className="text-label font-medium">{name}</span>
      {caption && <PosterCaption card={card} />}
    </Link>
  );
}
