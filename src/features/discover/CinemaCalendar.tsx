import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getUpcomingInCinemas } from "@/lib/tmdb";
import { CinemaPoster } from "./CinemaPoster";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Every upcoming German cinema release, grouped by release day. */
export async function CinemaCalendar() {
  const movies = await getUpcomingInCinemas().catch(() => []);
  if (movies.length === 0) {
    return <p className="text-body text-muted">No upcoming releases right now. Check back soon.</p>;
  }
  const days = Map.groupBy(movies, (m) => m.date!);
  return (
    <div className="flex flex-col gap-section">
      {[...days].map(([date, list]) => (
        <Section key={date} title={longDate(date)}>
          <PosterGrid>
            {list.map((m, i) => (
              <CinemaPoster key={m.card.id} card={m.card} date={date} trailer={m.trailer} index={i} showDate={false} />
            ))}
          </PosterGrid>
        </Section>
      ))}
    </div>
  );
}
