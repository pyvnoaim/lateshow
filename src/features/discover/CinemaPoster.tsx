import { PosterLink } from "@/components/PosterLink";
import { Trailer } from "@/components/Trailer";
import { getLanguage } from "@/lib/region";
import { getGenreNames, type Card } from "@/lib/tmdb";

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

/** Poster for an upcoming movie: release date and a trailer link under the title. */
export async function CinemaPoster({
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
  const genres = await getGenreNames(await getLanguage()).catch(() => ({}) as Record<number, string>);
  const genre = card.genre_ids?.map((id) => genres[id]).find(Boolean);
  // Same shape as every other caption ("Movie · 2026 · Crime"), the release day stands in for the year.
  const parts = ["Movie", showDate ? shortDate(date) : null, genre].filter(Boolean);
  return (
    <div className="flex flex-col gap-0.5">
      <PosterLink card={card} index={index} morph={false} caption={false} />
      {/* date and trailer live outside the link: a button inside a link is invalid */}
      <div className="flex items-center gap-1.5 text-caption text-muted nums">
        <span className="truncate">{parts.join(" · ")}</span>
        {trailer && <span aria-hidden>·</span>}
        {trailer && <Trailer youtubeKey={trailer} title={card.title ?? ""} variant="text" />}
      </div>
    </div>
  );
}
