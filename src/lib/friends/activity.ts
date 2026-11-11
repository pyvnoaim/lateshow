/** "anna_k", "anna_k and ben", "anna_k and 2 friends". First name is the most recent. Pure. */
export function friendsSentence(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} friends`;
}

type WatchedRow = { mediaType: "movie" | "tv"; tmdbId: number; name: string; at: Date };

/** A week of friends' rows as one entry per title: who watched it (newest first, each once) and when last. Pure. */
export function groupByTitle(rows: WatchedRow[]) {
  const byTitle = new Map<string, { mediaType: "movie" | "tv"; tmdbId: number; names: string[]; last: Date }>();
  for (const r of rows.toSorted((a, b) => b.at.getTime() - a.at.getTime())) {
    const key = `${r.mediaType}-${r.tmdbId}`;
    const entry = byTitle.get(key) ?? { mediaType: r.mediaType, tmdbId: r.tmdbId, names: [], last: r.at };
    if (!entry.names.includes(r.name)) entry.names.push(r.name);
    byTitle.set(key, entry);
  }
  return [...byTitle.values()];
}
