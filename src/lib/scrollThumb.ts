/**
 * Where a scrollbar's thumb sits in `n` cells: [first cell, length], for `seen` of `all` scrolled `offset` in.
 * Ported from Resona's ASCII skin (src/skin.rs, thumb). Pure.
 */
export function thumb(n: number, seen: number, all: number, offset: number): [number, number] {
  const len = Math.min(Math.max(Math.round((seen / all) * n), 1), n);
  return [Math.min(Math.round((offset / all) * n), n - len), len];
}
