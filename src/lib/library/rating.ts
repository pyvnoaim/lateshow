/** Your verdict on a title. Apple TV style, no stars: not for me, liked it, loved it. */
export const RATINGS = { down: -1, up: 1, love: 2 } as const;
export type Rating = (typeof RATINGS)[keyof typeof RATINGS];

/**
 * A score out of 10 (IMDb 1 to 10, Letterboxd stars doubled) as a rating. 9 and up loved, 6 and up liked,
 * 4 and below not for me, a 5 says nothing either way.
 */
export function fromScore(outOf10: number): Rating | undefined {
  if (!(outOf10 > 0)) return undefined;
  if (outOf10 >= 9) return RATINGS.love;
  if (outOf10 >= 6) return RATINGS.up;
  if (outOf10 <= 4) return RATINGS.down;
  return undefined;
}
