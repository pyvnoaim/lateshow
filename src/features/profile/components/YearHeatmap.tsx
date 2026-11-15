import Link from "next/link";
import type { Day, Level } from "@/features/profile/yearGrid";

const LEVELS: Record<Level, string> = {
  0: "bg-raised glass-cell",
  1: "bg-accent/30 glass-cell-lit",
  2: "bg-accent/55 glass-cell-lit",
  3: "bg-accent/80 glass-cell-lit",
  4: "bg-accent glass-cell-lit",
};

const day = (d: Day) =>
  new Date(d.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const watchedFor = (d: Day) =>
  d.minutes
    ? d.minutes >= 60
      ? `${Math.round((d.minutes / 60) * 10) / 10} h watched`
      : `${d.minutes} min watched`
    : "Nothing watched";

/**
 * One square per day, a column per week, like a contribution graph. A day with watches links to `dayHref(date)`,
 * where the page lists its titles. `selected` is the open day, ringed.
 */
export function YearHeatmap({
  days,
  dayHref,
  selected,
}: {
  days: Day[];
  dayHref: (date: string) => string;
  selected?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-3xl auto-cols-fr grid-flow-col grid-rows-7 gap-1">
          {days.map((d) =>
            d.pad ? (
              <div key={d.date} aria-hidden />
            ) : d.level === 0 ? (
              <div
                key={d.date}
                data-tip={day(d)}
                data-tip-meta={watchedFor(d)}
                className={`aspect-square rounded-sm ${LEVELS[0]}`}
              />
            ) : (
              <Link
                key={d.date}
                href={dayHref(d.date)}
                scroll={false}
                aria-label={`${day(d)}, ${watchedFor(d)}`}
                aria-current={d.date === selected ? "date" : undefined}
                data-tip={day(d)}
                data-tip-meta={watchedFor(d)}
                className={`aspect-square press rounded-sm ${LEVELS[d.level]} ${d.date === selected ? "ring-2 ring-fg" : ""}`}
              />
            ),
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-caption text-muted" aria-hidden>
        Less
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <span key={l} className={`size-3 rounded-sm ${LEVELS[l]}`} />
        ))}
        More
      </div>
    </div>
  );
}
