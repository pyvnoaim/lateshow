/** Where a watchlist title goes, by what you can do with it tonight. */
export type Shelf = "now" | "coming" | "rent" | "nowhere";

/**
 * Not out yet: coming. On a subscription you have: now (no services picked = any subscription). On a subscription
 * you don't have, or to rent or buy: elsewhere ("rent"). Nowhere in your country: nowhere. Pure.
 */
export function shelfFor(t: { release: string | null; today: string; onYours: boolean; elsewhere: boolean }): Shelf {
  if (t.release && t.release > t.today) return "coming";
  if (t.onYours) return "now";
  if (t.elsewhere) return "rent";
  return "nowhere";
}

/** Whole days until a moment, rounded up, never below 0. Null without a date. Pure. */
export function daysUntil(iso: string | null | undefined, now: Date) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000));
}

export const SORTS = ["leaving", "added", "rating", "shortest"] as const;
export type Sort = (typeof SORTS)[number];

type Sortable = { leavesIn: number | null; addedAt: Date; rating: number; minutes: number | null };

/** Watch now's order. Leaving soon puts dated titles first (soonest first), then the rest by when you added them. */
export function sortShelf<T extends Sortable>(items: T[], sort: Sort): T[] {
  const added = (a: T, b: T) => b.addedAt.getTime() - a.addedAt.getTime();
  const by: Record<Sort, (a: T, b: T) => number> = {
    leaving: (a, b) => (a.leavesIn ?? Infinity) - (b.leavesIn ?? Infinity) || added(a, b),
    added,
    rating: (a, b) => b.rating - a.rating,
    shortest: (a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity),
  };
  return items.toSorted(by[sort]);
}

/** Service names for a caption: each once, add-on channels ("HBO Max Amazon Channel") only when nothing else. Pure. */
export function readableNames(names: string[]) {
  const unique = [...new Set(names)];
  const real = unique.filter((n) => !/channel/i.test(n));
  return real.length > 0 ? real : unique;
}
