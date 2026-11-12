/**
 * What a taste match compares: the titles someone watched ("tv-1396"), how often each genre comes up, and their
 * ratings by title (-1 not for me, 1 liked, 2 loved).
 */
export type Taste = { titles: Set<string>; genres: Map<number, number>; ratings?: Map<string, number> };

/** Titles each person needs before a match means anything. */
export const MIN_TITLES = 10;

/**
 * 0 to 100: half how many titles you share (of the smaller list, so a long history isn't punished),
 * half how alike your genre mix is (cosine of the genre counts). A title one of you rated down and the other up
 * isn't shared taste, so it doesn't count. Null until both have MIN_TITLES. Pure.
 */
export function tasteMatch(a: Taste, b: Taste): number | null {
  if (a.titles.size < MIN_TITLES || b.titles.size < MIN_TITLES) return null;
  let shared = 0;
  for (const t of a.titles) {
    if (!b.titles.has(t)) continue;
    const ra = a.ratings?.get(t) ?? 0;
    const rb = b.ratings?.get(t) ?? 0;
    if (ra * rb >= 0) shared++; // opposite signs: one disliked what the other liked
  }
  const overlap = shared / Math.min(a.titles.size, b.titles.size);

  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [g, n] of a.genres) {
    dot += n * (b.genres.get(g) ?? 0);
    na += n * n;
  }
  for (const n of b.genres.values()) nb += n * n;
  const genres = na && nb ? dot / Math.sqrt(na * nb) : 0;

  return Math.round((100 * (overlap + genres)) / 2);
}
