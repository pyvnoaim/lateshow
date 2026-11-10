import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";
import { img, type Card } from "@/lib/tmdb";
import { TmdbImage } from "./TmdbImage";

export function PosterLink({ card, index = 0 }: { card: Card; index?: number }) {
  const name = card.title ?? card.name ?? "";
  const year = (card.release_date ?? card.first_air_date ?? "").slice(0, 4);
  const poster = img(card.poster_path, "w500");
  return (
    <Link
      href={`/title/${card.media_type}/${card.id}`}
      prefetch
      className="flex rise flex-col gap-2.5 rounded-poster"
      style={{ animationDelay: `${Math.min(index, 12) * 80}ms` } as CSSProperties}
    >
      <ViewTransition name={`title-${card.media_type}-${card.id}`} share="morph" default="none">
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
      </ViewTransition>
      <span className="text-label font-medium">{name}</span>
      <span className="-mt-2 text-caption text-muted">
        {card.media_type === "tv" ? "Series" : "Movie"}
        {year && ` · ${year}`}
      </span>
    </Link>
  );
}
