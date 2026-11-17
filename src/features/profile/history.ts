import { watchDay } from "@/lib/library/importing";

type HistoryRow = {
  id: number;
  mediaType: "movie" | "tv";
  tmdbId: number;
  season: number;
  episode: number;
  watchedAt: Date | null; // null: "A while ago", no date
  rewatch?: boolean;
};

/**
 * Rows (newest first) as entries: back to back episodes of one show on one day become one entry, so a binge reads
 * "Season 6, episodes 12 to 15" instead of four lines. `label` groups them ("Today", "October"), a run never crosses one.
 */
export function historyEntries<T extends HistoryRow>(rows: T[], label: (d: Date | null) => string) {
  const groups: [string, { row: T; episodes: T[] }[]][] = [];
  for (const r of rows) {
    const day = label(r.watchedAt);
    let group = groups.at(-1);
    if (group?.[0] !== day) groups.push((group = [day, []]));
    const last = group[1].at(-1);
    const prev = last?.episodes.at(-1);
    // a rewatch and a first watch of one show stay apart, so the line can say "Rewatch"
    const run =
      r.mediaType === "tv" && prev?.mediaType === "tv" && prev.tmdbId === r.tmdbId && !prev.rewatch === !r.rewatch;
    // same calendar day too: under a month heading, a show watched weekly stays one line per episode
    // (two undated rows count as the same day: a show marked "A while ago" is one line)
    if (run && watchDay(prev.watchedAt?.getTime()) === watchDay(r.watchedAt?.getTime())) last!.episodes.push(r);
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

/**
 * One day's rows as one entry per title (all of a show's episodes that day together, wherever they fell), the most
 * watched first: the heatmap's day card and day view. A row with unknown runtime counts as 1 minute, like the grid.
 */
export function dayTitles<T extends HistoryRow & { minutes: number }>(rows: T[]) {
  const byTitle = new Map<string, { row: T; episodes: T[]; minutes: number }>();
  for (const r of rows) {
    const key = `${r.mediaType}-${r.tmdbId}`;
    const entry = byTitle.get(key) ?? byTitle.set(key, { row: r, episodes: [], minutes: 0 }).get(key)!;
    entry.episodes.push(r);
    entry.minutes += Math.max(r.minutes, 1);
  }
  return [...byTitle.values()].sort((a, b) => b.minutes - a.minutes);
}

/** "3.5 h" or "40 min". */
export const watchTime = (minutes: number) =>
  minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} h` : `${minutes} min`;
