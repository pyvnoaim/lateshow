/**
 * The question in the episode row after you check a later one: "Watched episode 2 too?",
 * "Watched episodes 1 to 60 too?", or with gaps "Watched the 4 before it too?". Pure.
 */
export function earlierText(ns: number[]) {
  if (ns.length === 1) return `Watched episode ${ns[0]} too?`;
  if (ns.length === 2) return `Watched episodes ${ns[0]} and ${ns[1]} too?`;
  const run = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1);
  return run ? `Watched episodes ${ns[0]} to ${ns.at(-1)} too?` : `Watched the ${ns.length} before it too?`;
}
