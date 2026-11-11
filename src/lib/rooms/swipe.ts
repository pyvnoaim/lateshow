/**
 * Which services a room's deck comes from: the ones everyone has. People who never picked services don't count
 * (they'd empty the set). Nothing shared: anyone's. Nobody picked any: [] (any subscription in the country). Pure.
 */
export function roomServices(perPerson: number[][]): number[] {
  const picked = perPerson.filter((s) => s.length > 0);
  if (picked.length === 0) return [];
  const shared = picked.reduce((acc, s) => acc.filter((id) => s.includes(id)));
  return shared.length > 0 ? shared : [...new Set(picked.flat())];
}

/** Same order for everyone in the room, different for each room: a shuffle seeded by the room code. Pure. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The first title in deck order that every member liked, or null. Pure. */
export function findMatch(deck: number[], likes: Map<number, Set<string>>, members: string[]): number | null {
  if (members.length === 0) return null;
  return deck.find((id) => members.every((m) => likes.get(id)?.has(m))) ?? null;
}
