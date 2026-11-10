import { Section } from "@/components/ui/Section";
import type { SeasonData } from "./Episodes";

const STEPS = ["bg-heat-1 text-fg", "bg-heat-2 text-fg", "bg-heat-3 text-bg", "bg-heat-4 text-bg"];

// Brightness is relative to this show's own best and worst episode, so weaker shows still get a readable spread.
// ponytail: linear 4-step bucketing, switch to quantiles if one outlier squashes everything into one step.
export function Heatmap({ seasons }: { seasons: SeasonData[] }) {
  const rated = seasons.flatMap((s) => s.episodes.map((e) => e.rating)).filter((r) => r > 0);
  if (rated.length === 0) return null;
  const min = Math.min(...rated);
  const span = Math.max(...rated) - min || 1;
  const step = (r: number) => STEPS[Math.min(3, Math.floor(((r - min) / span) * 4))];

  return (
    <Section title="Episode ratings" aside={<p className="text-label text-muted">Brighter is better.</p>}>
      <div className="overflow-x-auto pb-2">
        <table className="border-separate border-spacing-1.5 nums">
          <tbody>
            {seasons.map((s) => (
              <tr key={s.number}>
                <th scope="row" className="pr-2 text-left text-small font-semibold text-muted">
                  S{s.number}
                </th>
                {s.episodes.map((e) => (
                  <td
                    key={e.n}
                    title={`S${s.number} E${e.n} · ${e.name}`}
                    className={`h-12 w-14 min-w-14 rounded-thumb text-center text-label font-semibold ${
                      e.rating > 0 ? step(e.rating) : "bg-surface text-muted"
                    }`}
                  >
                    {e.rating > 0 ? e.rating.toFixed(1) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
