import { ArrowUpRight, Play, Star } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LibraryToggle } from "@/components/library/LibraryToggle";
import { PosterLink } from "@/components/PosterLink";
import { BackdropHero, BackdropHeroSkeleton, heroTitle } from "@/components/BackdropHero";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PosterGrid, PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { getWatchLinks, type WatchLink } from "@/lib/justwatch";
import { setOnWatchlist, setWatched, type TitleRef } from "@/lib/library/actions";
import { nextEpisode, parseEpisodeKeys, type EpisodeRef } from "@/lib/library/progress";
import { getTitleLibrary } from "@/lib/library/queries";
import { COUNTRY, getSeasons, getTitle, img, type MediaType, type Title } from "@/lib/tmdb";
import { Episodes, type SeasonData } from "./components/Episodes";
import { RatingsGrid } from "./components/RatingsGrid";
import { Trailer } from "./components/Trailer";

type Library = { signedIn: boolean; onWatchlist: boolean; watched: string[]; ref: TitleRef };

export async function TitleView({ type, id }: { type: string; id: string }) {
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) notFound();
  const t = await getTitle(type, id).catch(() => notFound());
  const name = t.title ?? t.name ?? "";
  const [links, session] = await Promise.all([getWatchLinks(type, t.id, name), getSession()]);
  const lib = session ? await getTitleLibrary(session.user.id, type, t.id) : { onWatchlist: false, watched: [] };
  const library: Library = {
    signedIn: session !== null,
    ...lib,
    ref: { type, tmdbId: t.id, title: name, posterPath: t.poster_path },
  };
  const trailer =
    t.videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    t.videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer");
  // Season sizes are in the title details already, so "up next" needs no extra request.
  const next =
    type === "tv" && lib.watched.length > 0
      ? nextEpisode(
          (t.seasons ?? []).map((s) => ({ number: s.season_number, episodeCount: s.episode_count })),
          parseEpisodeKeys(lib.watched),
        )
      : null;

  return (
    <>
      <Hero t={t} type={type} name={name} links={links} trailerKey={trailer?.key} library={library} next={next} />
      <WhereToWatch links={links} fallback={t["watch/providers"].results[COUNTRY]?.link} />
      <Container as="main" className="flex flex-col gap-section pt-section">
        {type === "tv" && (
          <Suspense fallback={<div className="h-80 sk rounded-banner" />}>
            <SeasonSections t={t} library={library} startSeason={next?.season} />
          </Suspense>
        )}
        <Cast t={t} />
        {t.recommendations.results.length > 0 && (
          <Section title="If you liked this">
            <PosterGrid>
              {t.recommendations.results.slice(0, 12).map((c, i) => (
                <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
              ))}
            </PosterGrid>
          </Section>
        )}
      </Container>
    </>
  );
}

function meta(t: Title, type: MediaType) {
  const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
  const genres = t.genres
    .slice(0, 2)
    .map((g) => g.name)
    .join(", ");
  const length =
    type === "tv"
      ? `${t.number_of_seasons} season${t.number_of_seasons === 1 ? "" : "s"}`
      : t.runtime
        ? `${Math.floor(t.runtime / 60)} h ${t.runtime % 60} min`
        : "";
  return [year, genres, length].filter(Boolean).join(" · ");
}

/** Full-bleed backdrop under the top bar, title and actions at the bottom. */
function Hero({
  t,
  type,
  name,
  links,
  trailerKey,
  library,
  next,
}: {
  t: Title;
  type: MediaType;
  name: string;
  links: WatchLink[];
  trailerKey?: string;
  library: Library;
  next: EpisodeRef | null;
}) {
  const primary = links[0];
  const watchLabel = primary
    ? `${next ? `S${next.season} E${next.episode}` : primary.included ? "Watch" : "Rent or buy"} on ${primary.service}`
    : null;

  return (
    <BackdropHero backdropPath={t.backdrop_path} transitionName={`title-${type}-${t.id}`}>
      <h1 className={heroTitle}>{name}</h1>
      <div className="flex flex-wrap items-center gap-x-2 text-label text-fg/80 nums">
        <span>{meta(t, type)}</span>
        {t.vote_average > 0 && (
          <span className="inline-flex items-center gap-1">
            · <Star size={13} strokeWidth={2} aria-hidden /> {t.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      {t.overview && <p className="line-clamp-3 max-w-search text-body leading-normal text-fg/80">{t.overview}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {primary && watchLabel && (
          <a href={primary.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary")}>
            <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden />
            {watchLabel}
          </a>
        )}
        {trailerKey && <Trailer youtubeKey={trailerKey} title={name} />}
        <LibraryToggle
          kind="watchlist"
          signedIn={library.signedIn}
          initial={library.onWatchlist}
          toggle={setOnWatchlist.bind(null, library.ref)}
        />
        {type === "movie" && (
          <LibraryToggle
            kind="watched"
            signedIn={library.signedIn}
            initial={library.watched.includes("0-0")}
            toggle={setWatched.bind(null, { ...library.ref, minutes: t.runtime ?? 0 })}
          />
        )}
      </div>
    </BackdropHero>
  );
}

/** One quiet line: subscription services first, then a few rent or buy stores. */
function WhereToWatch({ links, fallback }: { links: WatchLink[]; fallback?: string }) {
  const included = links.filter((l) => l.included).slice(0, 4);
  const paid = links.filter((l) => !l.included).slice(0, 3);
  const link = (l: WatchLink) => (
    <a
      key={l.service}
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 transition-colors hover:text-fg"
    >
      {l.service}
      <ArrowUpRight size={14} strokeWidth={2} className="text-muted" aria-hidden />
    </a>
  );

  return (
    <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-label">
      <span className="text-muted">Where to watch</span>
      {links.length === 0 && (
        <span className="text-muted">
          Not streaming in Germany right now.
          {fallback && (
            <>
              {" "}
              <a href={fallback} target="_blank" rel="noopener noreferrer" className="text-accent">
                Rent or buy options
              </a>
            </>
          )}
        </span>
      )}
      {included.map(link)}
      {paid.length > 0 && <span className="text-muted">Rent or buy</span>}
      {paid.map(link)}
    </Container>
  );
}

async function SeasonSections({ t, library, startSeason }: { t: Title; library: Library; startSeason?: number }) {
  const numbers = (t.seasons ?? [])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => s.season_number);
  const raw = await getSeasons(String(t.id), numbers);
  const seasons: SeasonData[] = raw.map((s) => ({
    number: s.number,
    episodes: s.episodes.map((e) => ({
      n: e.episode_number,
      name: e.name,
      rating: e.vote_average,
      still: img(e.still_path, "w300"),
      lowStill: img(e.still_path, "w92"),
      runtime: e.runtime,
    })),
  }));
  return (
    <div className="grid grid-cols-1 gap-section lg:grid-cols-main-aside">
      <Episodes
        seasons={seasons}
        library={{ signedIn: library.signedIn, watched: library.watched, ref: library.ref, startSeason }}
      />
      <RatingsGrid seasons={seasons} watched={library.watched} />
    </div>
  );
}

function Cast({ t }: { t: Title }) {
  const cast = t.credits.cast.slice(0, 9);
  if (cast.length === 0) return null;
  return (
    <Section title="Cast">
      <ul className="grid grid-cols-people gap-x-6 gap-y-5">
        {cast.map((c) => (
          <li key={c.id} className="flex items-center gap-3.5">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-raised">
              {c.profile_path && (
                <Image src={img(c.profile_path, "w185")!} alt="" fill sizes="48px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-label font-medium">{c.name}</div>
              <div className="truncate text-caption text-muted">{c.character}</div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function TitleSkeleton() {
  return (
    <>
      <BackdropHeroSkeleton />
      <Container className="flex flex-col gap-6 pt-section">
        <div className="h-8 w-72 sk rounded-lg" />
        <PosterGridSkeleton count={6} />
      </Container>
    </>
  );
}
