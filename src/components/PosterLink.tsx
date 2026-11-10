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
      className="rise flex flex-col gap-2.5 rounded-poster"
      style={{ animationDelay: `${Math.min(index, 12) * 80}ms` } as CSSProperties}
    >
      <ViewTransition name={`title-${card.media_type}-${card.id}`} share="morph" default="none">
        <div className="lift relative aspect-[2/3] overflow-hidden rounded-poster bg-raised">
          {poster ? (
            <TmdbImage src={poster} lowSrc={img(card.poster_path, "w92")!} alt={name} sizes="(max-width: 640px) 45vw, 200px" />
          ) : (
            <span className="absolute inset-0 flex items-end p-3.5 text-lg font-bold tracking-tight">{name}</span>
          )}
        </div>
      </ViewTransition>
      <span className="text-[13px] text-muted">
        {card.media_type === "tv" ? "Series" : "Movie"}
        {year && ` · ${year}`}
      </span>
    </Link>
  );
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="sk aspect-[2/3] rounded-poster" />
          <div className="sk h-3 w-2/3 rounded-md" />
        </div>
      ))}
    </div>
  );
}
