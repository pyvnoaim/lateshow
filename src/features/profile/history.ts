type HistoryRow = {
  id: number;
  mediaType: "movie" | "tv";
  tmdbId: number;
  season: number;
  episode: number;
  watchedAt: Date;
};

/**
 * Rows (newest first) as entries: back to back episodes of one show become one entry, so a binge reads
 * "Season 6, episodes 12 to 15" instead of four lines. `label` groups them ("Today", "October"), a run never crosses one.
 */
export function historyEntries<T extends HistoryRow>(rows: T[], label: (d: Date) => string) {
  const groups: [string, { row: T; episodes: T[] }[]][] = [];
  for (const r of rows) {
    const day = label(r.watchedAt);
    let group = groups.at(-1);
    if (group?.[0] !== day) groups.push((group = [day, []]));
    const last = group[1].at(-1);
    if (r.mediaType === "tv" && last?.row.mediaType === "tv" && last.row.tmdbId === r.tmdbId) last.episodes.push(r);
    else group[1].push({ row: r, episodes: [r] });
  }
  return groups;
}

/** "Season 1, episode 2", "Season 6, episodes 12 to 15", "Season 5 to 6, 14 episodes", "Movie". */
export function episodesLabel(episodes: HistoryRow[]) {
  if (episodes[0].mediaType === "movie") return "Movie";
  const sorted = episodes.toSorted((a, b) => a.season - b.season || a.episode - b.episode);
  const first = sorted[0];
  const last = sorted.at(-1)!;
  if (sorted.length === 1) return `Season ${first.season}, episode ${first.episode}`;
  if (first.season !== last.season) return `Season ${first.season} to ${last.season}, ${sorted.length} episodes`;
  const gapless = last.episode - first.episode + 1 === sorted.length;
  return gapless
    ? `Season ${first.season}, episodes ${first.episode} to ${last.episode}`
    : `Season ${first.season}, ${sorted.length} episodes`;
}
