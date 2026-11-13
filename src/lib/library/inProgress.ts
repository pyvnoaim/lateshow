import "server-only";
import { getLanguage } from "@/lib/region";
import { getWatchLinks } from "@/lib/justwatch";
import { nextEpisode, parseEpisodeKeys, showProgress } from "@/lib/library/progress";
import { getRecentShows, getTitleLibrary } from "@/lib/library/queries";
import { getEnglishName, getSeasons, getTitle, pickLogo, yourServicesFirst } from "@/lib/tmdb";
import { getMyServiceIds } from "@/lib/settings/queries";

export type ShowInProgress = NonNullable<Awaited<ReturnType<typeof loadShow>>>;

/** Your shows that still have an episode to watch, most recently watched first. */
export async function getShowsInProgress(userId: string, limit: number, country: string) {
  const recent = await getRecentShows(userId, limit + 4); // some may be caught up
  // one at a time until there are enough: the top bar asks for 1 on every page, so this is usually one show's work
  const shows: ShowInProgress[] = [];
  for (const r of recent) {
    if (shows.length >= limit) break;
    const s = await loadShow(userId, r.tmdbId, r.title, country);
    if (s) shows.push(s);
  }
  return shows;
}

async function loadShow(userId: string, tmdbId: number, fallbackName: string, country: string) {
  const lang = await getLanguage();
  const t = await getTitle("tv", String(tmdbId), lang).catch(() => null);
  if (!t) return null;
  const seasons = (t.seasons ?? []).map((s) => ({ number: s.season_number, episodeCount: s.episode_count }));
  const watched = parseEpisodeKeys((await getTitleLibrary(userId, "tv", t.id)).watched);
  const next = nextEpisode(seasons, watched);
  if (!next) return null;
  const name = t.name ?? fallbackName;
  const [[season], allLinks, myIds] = await Promise.all([
    getSeasons(String(t.id), [next.season], lang),
    getEnglishName("tv", t.id)
      .catch(() => name)
      .then((en) => getWatchLinks("tv", t.id, en, country)),
    getMyServiceIds(),
  ]);
  const links = yourServicesFirst(allLinks, t, country, myIds);
  return {
    id: t.id,
    name,
    backdropPath: t.backdrop_path,
    logo: pickLogo(t, lang),
    next,
    episodeName: season?.episodes.find((e) => e.episode_number === next.episode)?.name,
    percent: showProgress(seasons, watched).percent,
    link: links[0],
  };
}
