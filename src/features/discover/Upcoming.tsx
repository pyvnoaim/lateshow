import { PosterLink } from "@/components/PosterLink";
import { Trailer } from "@/components/Trailer";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getUpcomingInCinemas } from "@/lib/tmdb";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Coming to cinemas": the next German releases, each with its release date and a trailer button on the poster. */
export async function Upcoming() {
  const movies = await getUpcomingInCinemas();
  // full rows only: the grid has 6 columns on desktop
  const shown = movies.slice(0, movies.length >= 12 ? 12 : movies.length >= 6 ? 6 : movies.length);
  if (shown.length === 0) return null;

  return (
    <Section title="Coming to cinemas" description="New in German cinemas soon.">
      <PosterGrid>
        {shown.map(({ card, date, trailer }, i) => (
          <div key={card.id} className="flex flex-col gap-0.5">
            <PosterLink card={card} index={i} morph={false} caption={null} />
            {/* date and trailer live outside the link: a button inside a link is invalid */}
            <div className="flex items-center gap-1.5 text-caption text-muted nums">
              <span>{day(date!)}</span>
              {trailer && (
                <>
                  <span aria-hidden>·</span>
                  <Trailer youtubeKey={trailer} title={card.title ?? ""} variant="text" />
                </>
              )}
            </div>
          </div>
        ))}
      </PosterGrid>
    </Section>
  );
}
