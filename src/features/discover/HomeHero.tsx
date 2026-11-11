import { Play } from "lucide-react";
import Link from "next/link";
import { BackdropHero, heroTitle } from "@/components/BackdropHero";
import { HeroLogo } from "@/components/HeroShell";
import { buttonStyles } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getSession } from "@/lib/auth";
import { HeroCarousel, type HeroSlide } from "@/components/HeroCarousel";
import { setOnWatchlist } from "@/lib/library/actions";
import { getTitleLibrary } from "@/lib/library/queries";
import { getTitle, getTrending, img, pickLogo, pickTrailer, titleMeta } from "@/lib/tmdb";
import { getShowsInProgress, type ShowInProgress } from "./inProgress";
import { getLanguage, getRegion } from "@/lib/region";

/** Your show in progress when there is one, otherwise this week's top trending title. */
export async function HomeHero() {
  const session = await getSession();
  const [show] = session ? await getShowsInProgress(session.user.id, 1, (await getRegion()).code) : [];
  return show ? <ContinueWatching {...show} /> : <Featured userId={session?.user.id} />;
}

function ContinueWatching(show: ShowInProgress) {
  const label = `S${show.next.season} E${show.next.episode}`;
  return (
    <BackdropHero backdropPath={show.backdropPath}>
      <span className="text-label text-fg/80">Continue watching</span>
      {show.logo ? (
        <HeroLogo src={img(show.logo.path, "w500")!} aspectRatio={show.logo.aspectRatio} name={show.name} />
      ) : (
        <h1 className={heroTitle}>{show.name}</h1>
      )}
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

/** Top 5 trending titles with a backdrop, rotating. Logo artwork, meta, trailer, details, watchlist. */
async function Featured({ userId }: { userId?: string }) {
  const lang = await getLanguage();
  const top = (await getTrending("all", 1, lang)).filter((c) => c.backdrop_path).slice(0, 5);
  const slides = await Promise.all(
    top.map(async (c): Promise<HeroSlide | null> => {
      const t = await getTitle(c.media_type, String(c.id), lang).catch(() => null);
      if (!t) return null;
      const name = t.title ?? t.name ?? "";
      const logo = pickLogo(t, lang);
      const listed = userId ? (await getTitleLibrary(userId, c.media_type, t.id)).onWatchlist : false;
      return {
        key: `${c.media_type}-${t.id}`,
        href: `/title/${c.media_type}/${t.id}`,
        name,
        logo: logo ? { src: img(logo.path, "w500")!, aspectRatio: logo.aspectRatio } : null,
        backdrop: img(t.backdrop_path, "original")!,
        meta: titleMeta(t, c.media_type),
        rating: t.vote_average,
        overview: t.overview || undefined,
        trailerKey: pickTrailer(t.videos.results)?.key,
        watchlist: {
          signedIn: userId !== undefined,
          initial: listed,
          toggle: setOnWatchlist.bind(null, {
            type: c.media_type,
            tmdbId: t.id,
            title: name,
            posterPath: t.poster_path,
          }),
        },
      };
    }),
  );
  const ready = slides.filter((s): s is HeroSlide => s !== null);
  return ready.length > 0 ? <HeroCarousel slides={ready} /> : null;
}
