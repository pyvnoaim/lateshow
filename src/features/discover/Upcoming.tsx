import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getUpcomingInCinemas } from "@/lib/tmdb";
import { CinemaPoster } from "./CinemaPoster";

/** "Coming to cinemas" on Home: the next 6 German releases, the rest on /cinemas. */
export async function Upcoming() {
  const movies = (await getUpcomingInCinemas().catch(() => [])).slice(0, 6);
  if (movies.length === 0) return null;
  return (
    <Section title="Coming to cinemas" description="New in German cinemas soon." moreHref="/cinemas">
      <PosterGrid>
        {movies.map((m, i) => (
          <CinemaPoster key={m.card.id} card={m.card} date={m.date!} trailer={m.trailer} index={i} />
        ))}
      </PosterGrid>
    </Section>
  );
}
