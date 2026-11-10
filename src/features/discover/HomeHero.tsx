import { Play } from "lucide-react";
import Link from "next/link";
import { BackdropHero, heroTitle } from "@/components/BackdropHero";
import { buttonStyles } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getSession } from "@/lib/auth";
import { getWatchLinks } from "@/lib/justwatch";
import { nextEpisode, parseEpisodeKeys, showProgress } from "@/lib/library/progress";
import { getRecentShows, getTitleLibrary } from "@/lib/library/queries";
import { getSeasons, getTitle, getTrending } from "@/lib/tmdb";

/** Your show in progress when there is one, otherwise this week's top trending title. */
export async function HomeHero() {
  const session = await getSession();
  const show = session ? await findShowInProgress(session.user.id) : null;
  return show ? <ContinueWatching {...show} /> : <Featured />;
}

async function findShowInProgress(userId: string) {
  for (const recent of await getRecentShows(userId, 5)) {
    const t = await getTitle("tv", String(recent.tmdbId)).catch(() => null);
    if (!t) continue;
    const seasons = (t.seasons ?? []).map((s) => ({ number: s.season_number, episodeCount: s.episode_count }));
    const watched = parseEpisodeKeys((await getTitleLibrary(userId, "tv", t.id)).watched);
    const next = nextEpisode(seasons, watched);
    if (!next) continue; // caught up, try the next show
    const name = t.name ?? recent.title;
    const [[season], links] = await Promise.all([
      getSeasons(String(t.id), [next.season]),
      getWatchLinks("tv", t.id, name),
    ]);
    const episode = season?.episodes.find((e) => e.episode_number === next.episode);
    return {
      id: t.id,
      name,
      backdropPath: t.backdrop_path,
      next,
      episodeName: episode?.name,
      percent: showProgress(seasons, watched).percent,
      link: links[0],
    };
  }
  return null;
}

function ContinueWatching(show: NonNullable<Awaited<ReturnType<typeof findShowInProgress>>>) {
  const label = `S${show.next.season} E${show.next.episode}`;
  return (
    <BackdropHero backdropPath={show.backdropPath}>
      <span className="text-label text-fg/80">Continue watching</span>
      <h1 className={heroTitle}>{show.name}</h1>
      <div className="flex flex-wrap items-center gap-4 text-label text-fg/80 nums">
        <span>
          {label}
          {show.episodeName && ` · ${show.episodeName}`}
        </span>
        <ProgressBar percent={show.percent} label={`${show.percent}% of the show watched`} className="w-40" />
        <span>{show.percent}%</span>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        {show.link && (
          <a href={show.link.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary")}>
            <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden />
            {label} on {show.link.service}
          </a>
        )}
        <Link href={`/title/tv/${show.id}`} className={buttonStyles("glass")}>
          Details
        </Link>
      </div>
    </BackdropHero>
  );
}

async function Featured() {
  const top = (await getTrending()).find((c) => c.backdrop_path);
  if (!top) return null;
  const name = top.title ?? top.name ?? "";
  const [link] = await getWatchLinks(top.media_type, top.id, name);
  return (
    <BackdropHero backdropPath={top.backdrop_path}>
      <span className="text-label text-fg/80">Trending now</span>
      <h1 className={heroTitle}>{name}</h1>
      {top.overview && <p className="line-clamp-2 max-w-search text-body leading-normal text-fg/80">{top.overview}</p>}
      <div className="flex flex-wrap gap-3 pt-2">
        {link && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary")}>
            <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden />
            {link.included ? "Watch" : "Rent or buy"} on {link.service}
          </a>
        )}
        <Link href={`/title/${top.media_type}/${top.id}`} className={buttonStyles("glass")}>
          Details
        </Link>
      </div>
    </BackdropHero>
  );
}
