import { PosterLink } from "@/components/PosterLink";
import { Trailer } from "@/components/Trailer";
import type { Card } from "@/lib/tmdb";

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

/** Poster for an upcoming movie: release date and a trailer link under the title. */
export function CinemaPoster({
  card,
  date,
  trailer,
  index,
  showDate = true,
}: {
  card: Card;
  date: string;
  trailer?: string;
  index: number;
  showDate?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <PosterLink card={card} index={index} morph={false} caption={null} />
      {/* date and trailer live outside the link: a button inside a link is invalid */}
      <div className="flex items-center gap-1.5 text-caption text-muted nums">
        {showDate && <span>{shortDate(date)}</span>}
        {showDate && trailer && <span aria-hidden>·</span>}
        {trailer && <Trailer youtubeKey={trailer} title={card.title ?? ""} variant="text" />}
      </div>
    </div>
  );
}
