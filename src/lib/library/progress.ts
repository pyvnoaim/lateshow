export type EpisodeRef = { season: number; episode: number };
export type SeasonInfo = { number: number; episodeCount: number };

/** All regular episodes in airing order. Specials (season 0) don't count towards progress. */
function allEpisodes(seasons: SeasonInfo[]): EpisodeRef[] {
  return seasons
    .filter((s) => s.number > 0)
    .toSorted((a, b) => a.number - b.number)
    .flatMap((s) => Array.from({ length: s.episodeCount }, (_, i) => ({ season: s.number, episode: i + 1 })));
}

const key = (e: EpisodeRef) => `${e.season}-${e.episode}`;

/** Library keys ("2-4") back into episode refs. */
export function parseEpisodeKeys(keys: string[]): EpisodeRef[] {
  return keys.map((k) => {
    const [season, episode] = k.split("-").map(Number);
    return { season, episode };
  });
}

/**
 * The episode to watch next: the first unwatched one after the furthest watched episode.
 * Skipped episodes earlier in the show don't pull you back. Null when you're caught up.
 */
export function nextEpisode(seasons: SeasonInfo[], watched: EpisodeRef[]): EpisodeRef | null {
  const episodes = allEpisodes(seasons);
  const seen = new Set(watched.map(key));
  const furthest = episodes.findLastIndex((e) => seen.has(key(e)));
  return episodes.slice(furthest + 1).find((e) => !seen.has(key(e))) ?? null;
}

/** How far into the show you are, counting regular episodes only. */
export function showProgress(seasons: SeasonInfo[], watched: EpisodeRef[]) {
  const episodes = allEpisodes(seasons);
  const seen = new Set(watched.map(key));
  const done = episodes.filter((e) => seen.has(key(e))).length;
  return { done, total: episodes.length, percent: episodes.length ? Math.round((done / episodes.length) * 100) : 0 };
}
