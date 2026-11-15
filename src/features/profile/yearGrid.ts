export type Level = 0 | 1 | 2 | 3 | 4;
/** `pad`: not a day of the year so far (before Jan 1, only there so weeks start on Sunday, or after today). Drawn blank. */
export type Day = { date: string; minutes: number; level: Level; pad?: true };

const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * One calendar year as days, Jan 1 to Dec 31, padded back to a Sunday (a column per week when laid out in 7 rows).
 * Level 1 to 4 is which quarter of your watching days that year it falls in (by minutes), like GitHub: shades follow
 * your own spread, and one huge day (an import, a marathon) is just one day in the top quarter. Unknown runtime counts as 1 minute.
 * ponytail: days are UTC. Use the viewer's timezone once profiles show other people's activity.
 */
export function yearGrid(entries: { at: Date | null; minutes: number }[], today: Date, year: number): Day[] {
  const first = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  const last = Math.min(end, Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = first - new Date(first).getUTCDay() * DAY;

  const perDay = new Map<string, number>();
  for (const e of entries) {
    if (!e.at || e.at.getTime() < first || e.at.getTime() >= last + DAY) continue;
    const key = iso(e.at);
    perDay.set(key, (perDay.get(key) ?? 0) + Math.max(e.minutes, 1));
  }

  // the minutes where the 1st, 2nd and 3rd quarter of your watching days end
  const sorted = [...perDay.values()].sort((x, y) => x - y);
  const cut = [0.25, 0.5, 0.75].map((q) => sorted[Math.floor(q * (sorted.length - 1))] ?? 0);

  const days: Day[] = [];
  for (let t = start; t <= end; t += DAY) {
    const date = iso(new Date(t));
    const minutes = perDay.get(date) ?? 0;
    const level: Level = minutes === 0 ? 0 : minutes <= cut[0] ? 1 : minutes <= cut[1] ? 2 : minutes <= cut[2] ? 3 : 4;
    days.push(t < first || t > last ? { date, minutes: 0, level: 0, pad: true } : { date, minutes, level });
  }
  return days;
}
