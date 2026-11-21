/**
 * One ranking from several recommendation lists: a title scores the list's weight for each list it's on, more the
 * higher it sits there. A title several of your favorites point to beats the top of one list.
 */
export function blend<T extends { id: number; media_type: string }>(lists: { weight: number; items: T[] }[]): T[] {
  const scores = new Map<string, { item: T; score: number }>();
  for (const { weight, items } of lists) {
    items.forEach((item, rank) => {
      const key = `${item.media_type}-${item.id}`;
      const entry = scores.get(key) ?? { item, score: 0 };
      entry.score += weight / (1 + rank / items.length); // top 1, bottom just over half: two lists beat one
      scores.set(key, entry);
    });
  }
  return [...scores.values()].toSorted((a, b) => b.score - a.score).map((e) => e.item);
}
