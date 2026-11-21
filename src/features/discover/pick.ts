/** Small seeded random generator, so the same roll always gives the same picks (shareable, cache friendly). */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` different items, chosen by `seed`. Fewer if the list is shorter. */
export function pick<T>(items: T[], count: number, seed: number): T[] {
  const rest = [...items];
  const next = random(seed);
  const out: T[] = [];
  while (out.length < count && rest.length > 0) out.push(rest.splice(Math.floor(next() * rest.length), 1)[0]);
  return out;
}

/**
 * Roll `roll` (from 1) of a seeded shuffle, dealt like a deck: each roll takes the next cards, so nothing repeats
 * until the deck runs out, then it starts over. Within a roll each pick has a different first genre when it can.
 */
export function deal<T extends { genre_ids?: number[] }>(items: T[], count: number, roll: number, seed: number): T[] {
  const order = pick(items, items.length, seed);
  let deck: T[] = [];
  let hand: T[] = [];
  // ponytail: replays every earlier roll, O(roll x pool), fine for a 100 card pool and human clicking
  for (let r = 0; r < Math.max(roll, 1); r++) {
    if (deck.length < count) deck = [...order];
    hand = [];
    const genres = new Set<number | undefined>();
    for (const x of deck) {
      if (hand.length === count) break;
      if (genres.has(x.genre_ids?.[0])) continue;
      hand.push(x);
      genres.add(x.genre_ids?.[0]);
    }
    for (const x of deck) if (hand.length < count && !hand.includes(x)) hand.push(x);
    deck = deck.filter((x) => !hand.includes(x));
  }
  return hand;
}
