/**
 * The short question in the episode row after you check a later one: "Episode 2 too?", "1 and 2 too?",
 * "1 to 6 too?", or with gaps "4 earlier too?". Pure.
 */
export function earlierText(ns: number[]) {
  if (ns.length === 1) return `Episode ${ns[0]} too?`;
  if (ns.length === 2) return `${ns[0]} and ${ns[1]} too?`;
  const run = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1);
  return run ? `${ns[0]} to ${ns.at(-1)} too?` : `${ns.length} earlier too?`;
}
