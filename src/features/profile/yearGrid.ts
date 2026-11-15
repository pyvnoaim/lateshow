export type Level = 0 | 1 | 2 | 3 | 4;
/** `pad`: a day before the grid's first one, only there so the first week starts on Sunday. */
export type Day = { date: string; minutes: number; level: Level; pad?: true };

const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The last 53 weeks as days, Sunday first, oldest first, ending today (column per week when laid out in 7 rows).
 * With `year`: that calendar year instead, Jan 1 to Dec 31, padded back to a Sunday.
 * Level 1 to 4 is minutes that day relative to your busiest day. A watch with unknown runtime still counts as 1.
 * ponytail: days are UTC. Use the viewer's timezone once profiles show other people's activity.
 */
export function yearGrid(entries: { at: Date; minutes: number }[], today: Date, year?: number): Day[] {
  const end = year ? Date.UTC(year, 11, 31) : Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const first = year ? Date.UTC(year, 0, 1) : end - (52 * 7 + new Date(end).getUTCDay()) * DAY;
  const start = first - new Date(first).getUTCDay() * DAY;

  const perDay = new Map<string, number>();
  for (const e of entries) {
    if (e.at.getTime() < first || e.at.getTime() >= end + DAY) continue;
    const key = iso(e.at);
    perDay.set(key, (perDay.get(key) ?? 0) + Math.max(e.minutes, 1));
  }
  const busiest = Math.max(0, ...perDay.values());

  const days: Day[] = [];
  for (let t = start; t <= end; t += DAY) {
    const date = iso(new Date(t));
    const minutes = perDay.get(date) ?? 0;
    const level = minutes === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((minutes / busiest) * 4))) as Level);
    days.push(t < first ? { date, minutes, level, pad: true } : { date, minutes, level });
  }
  return days;
}
