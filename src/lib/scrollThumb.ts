/**
 * Where a scrollbar's thumb sits in `n` cells: [first cell, length], for `seen` of `all` scrolled `offset` in.
 * Ported from Resona's ASCII skin (src/skin.rs, thumb). Its length is capped at `max` of the rail, so a page that
 * barely scrolls gets a thumb, not a bar; its position runs over what's left, so it still ends flush at the bottom. Pure.
 */
export function thumb(n: number, seen: number, all: number, offset: number, max = 0.4): [number, number] {
  const len = Math.min(Math.max(Math.round((seen / all) * n), 1), Math.max(1, Math.floor(n * max)));
  const travel = Math.max(all - seen, 1);
  return [Math.min(Math.round((offset / travel) * (n - len)), n - len), len];
}
