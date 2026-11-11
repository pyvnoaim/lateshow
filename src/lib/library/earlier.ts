/**
 * The question after you check a later episode: "Episode 2 too?", "Episodes 1 and 2 too?", "Episodes 1 to 6 too?",
 * or with gaps "The 4 earlier episodes too?". Pure.
 */
export function earlierText(ns: number[]) {
  if (ns.length === 1) return `Episode ${ns[0]} too?`;
  if (ns.length === 2) return `Episodes ${ns[0]} and ${ns[1]} too?`;
  const run = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1);
  return run ? `Episodes ${ns[0]} to ${ns.at(-1)} too?` : `The ${ns.length} earlier episodes too?`;
}
