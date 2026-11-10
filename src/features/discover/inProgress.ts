import "server-only";
import { getWatchLinks } from "@/lib/justwatch";
import { nextEpisode, parseEpisodeKeys, showProgress } from "@/lib/library/progress";
import { getRecentShows, getTitleLibrary } from "@/lib/library/queries";
import { getSeasons, getTitle } from "@/lib/tmdb";

export type ShowInProgress = NonNullable<Awaited<ReturnType<typeof loadShow>>>;

/** Your shows that still have an episode to watch, most recently watched first. */
export async function getShowsInProgress(userId: string, limit: number) {
  const recent = await getRecentShows(userId, limit + 4); // some may be caught up
  const shows = await Promise.all(recent.map((r) => loadShow(userId, r.tmdbId, r.title)));
  return shows.filter((s): s is ShowInProgress => s !== null).slice(0, limit);
}

async function loadShow(userId: string, tmdbId: number, fallbackName: string) {
  const t = await getTitle("tv", String(tmdbId)).catch(() => null);
  if (!t) return null;
  const seasons = (t.seasons ?? []).map((s) => ({ number: s.season_number, episodeCount: s.episode_count }));
  const watched = parseEpisodeKeys((await getTitleLibrary(userId, "tv", t.id)).watched);
  const next = nextEpisode(seasons, watched);
  if (!next) return null;
  const name = t.name ?? fallbackName;
  const [[season], links] = await Promise.all([
    getSeasons(String(t.id), [next.season]),
    getWatchLinks("tv", t.id, name),
  ]);
  return {
    id: t.id,
    name,
    backdropPath: t.backdrop_path,
    next,
    episodeName: season?.episodes.find((e) => e.episode_number === next.episode)?.name,
    percent: showProgress(seasons, watched).percent,
    link: links[0],
  };
}
