/** 8 titles, 7 matches: 0-3 quarterfinals (pairs in deck order), 4-5 semifinals, 6 the final. */
export const BRACKET_SIZE = 8;
const FEEDS: Record<number, [number, number]> = { 4: [0, 1], 5: [2, 3], 6: [4, 5] };

export type Match = { index: number; a: number | null; b: number | null; winner: number | null; voted: string[] };

/**
 * The whole bracket from the votes (match -> member -> chosen title). A match is decided when every member voted
 * on it: most votes wins, a tie goes to the higher seed (earlier in the deck). Members who left don't count. Pure.
 */
export function bracketState(deck: number[], votes: Map<number, Map<string, number>>, members: string[]) {
  const matches: Match[] = [];
  for (let i = 0; i < 7; i++) {
    const [a, b] = i < 4 ? [deck[2 * i] ?? null, deck[2 * i + 1] ?? null] : FEEDS[i].map((m) => matches[m].winner);
    const mine = votes.get(i) ?? new Map<string, number>();
    const voted = members.filter((m) => mine.has(m));
    let winner: number | null = null;
    if (a !== null && b !== null && members.length > 0 && voted.length === members.length) {
      const forA = voted.filter((m) => mine.get(m) === a).length;
      const forB = voted.length - forA;
      winner = forA > forB ? a : forB > forA ? b : deck.indexOf(a) < deck.indexOf(b) ? a : b;
    }
    matches.push({ index: i, a, b, winner, voted });
  }
  const current = matches.find((m) => m.a !== null && m.b !== null && m.winner === null) ?? null;
  return { matches, current, champion: matches[6].winner };
}

/** "Quarterfinal", "Semifinal", "Final" and which match of the round, for the heading. Pure. */
export function roundLabel(index: number) {
  if (index < 4) return { round: "Quarterfinal", of: `${index + 1} of 4` };
  if (index < 6) return { round: "Semifinal", of: `${index - 3} of 2` };
  return { round: "Final", of: "" };
}
