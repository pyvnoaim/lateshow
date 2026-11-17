/** A viewing this close to an earlier one of the same episode is that one again (a re-sent mark, a timezone off by a day). */
export const SAME_VIEWING_MS = 2 * 86_400_000;

/**
 * Is a viewing at `at` a new one, given the earlier viewings of that episode? Undated ones ("A while ago") never
 * count as close, so watching it now is a rewatch.
 */
export function isRewatch(at: Date, earlier: (Date | null)[]) {
  return !earlier.some((d) => d && Math.abs(d.getTime() - at.getTime()) < SAME_VIEWING_MS);
}
