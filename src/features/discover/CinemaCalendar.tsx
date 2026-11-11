import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getCinemaCalendar } from "@/lib/tmdb";
import { CinemaPoster } from "./CinemaPoster";
import { getRegion } from "@/lib/region";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Cinema releases in your country for the next 6 months, grouped by release day. */
export async function CinemaCalendar() {
  const { code, lang } = await getRegion();
  const movies = await getCinemaCalendar(code, lang).catch(() => []);
  if (movies.length === 0) {
    return <p className="text-body text-muted">No upcoming releases right now. Check back soon.</p>;
  }
  const days = Map.groupBy(movies, (m) => m.date!);
  return (
    <div className="flex flex-col gap-section">
      {[...days].map(([date, list], d) => (
        <Section key={date} title={longDate(date)}>
          <PosterGrid>
            {list.map((m, i) => (
              <CinemaPoster
                key={m.card.id}
                card={m.card}
                date={date}
                trailer={m.trailer}
                index={i}
                showDate={false}
                eager={d === 0 && i < 6}
              />
            ))}
          </PosterGrid>
        </Section>
      ))}
    </div>
  );
}
