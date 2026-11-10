/** Home keeps its choices in the URL (shareable, back button works): ?trending=movie&decide=series&roll=3 */
export type HomeSearch = { trending?: string | string[]; decide?: string | string[]; roll?: string | string[] };
type Flat = { trending?: string; decide?: string; roll?: string };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function readHome(s: HomeSearch): Flat {
  return { trending: one(s.trending), decide: one(s.decide), roll: one(s.roll) };
}

/** A Home link with some params changed. Undefined removes a param. */
export function homeHref(current: Flat, patch: Partial<Flat>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
