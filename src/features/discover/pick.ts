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
