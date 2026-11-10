import type { Day, Level } from "@/features/profile/yearGrid";

const LEVELS: Record<Level, string> = {
  0: "bg-raised",
  1: "bg-accent/30",
  2: "bg-accent/55",
  3: "bg-accent/80",
  4: "bg-accent",
};

const day = (d: Day) =>
  new Date(d.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const watchedFor = (d: Day) =>
  d.minutes
    ? d.minutes >= 60
      ? `${Math.round((d.minutes / 60) * 10) / 10} h watched`
      : `${d.minutes} min watched`
    : "Nothing watched";

/** One square per day, a column per week, like a contribution graph. */
export function YearHeatmap({ days }: { days: Day[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-3xl auto-cols-fr grid-flow-col grid-rows-7 gap-1">
          {days.map((d) => (
            <div
              key={d.date}
              data-tip={day(d)}
              data-tip-meta={watchedFor(d)}
              className={`aspect-square rounded-sm glass-cell ${LEVELS[d.level]}`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-caption text-muted" aria-hidden>
        Less
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <span key={l} className={`size-3 rounded-sm glass-cell ${LEVELS[l]}`} />
        ))}
        More
      </div>
    </div>
  );
}
