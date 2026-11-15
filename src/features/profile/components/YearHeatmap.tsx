import type { Day, Level } from "@/features/profile/yearGrid";
import { watchTime } from "@/features/profile/history";
import { DayPeek, type PeekTitle } from "./DayPeek";

const LEVELS: Record<Level, string> = {
  0: "bg-raised glass-cell",
  1: "bg-accent/30 glass-cell-lit",
  2: "bg-accent/55 glass-cell-lit",
  3: "bg-accent/80 glass-cell-lit",
  4: "bg-accent glass-cell-lit",
};

const day = (d: Day) =>
  new Date(d.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const watchedFor = (d: Day) => (d.minutes ? `${watchTime(d.minutes)} watched` : "Nothing watched");

/**
 * One square per day, a column per week, like a contribution graph. A day with watches is a button that opens its
 * card (`peek`, see DayPeek).
 */
export function YearHeatmap({ days, peek }: { days: Day[]; peek: (date: string) => Promise<PeekTitle[]> }) {
  return (
    <div className="flex flex-col gap-3">
      <DayPeek peek={peek}>
        {/* p-1 (pulled back with -m-1): room for the open day's ring (aria-expanded), the scroll box clips everything outside it */}
        <div className="-m-1 overflow-x-auto p-1 pb-2">
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
                <button
                  key={d.date}
                  type="button"
                  aria-label={`${day(d)}, ${watchedFor(d)}`}
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  data-day={d.date}
                  data-tip={day(d)}
                  data-tip-meta={watchedFor(d)}
                  className={`aspect-square press rounded-sm ${LEVELS[d.level]} aria-expanded:ring-2 aria-expanded:ring-fg`}
                />
              ),
            )}
          </div>
        </div>
      </DayPeek>
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
