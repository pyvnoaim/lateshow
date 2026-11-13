import { ArrowUpRight, Play, Star, Ticket } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LibraryToggle } from "@/components/library/LibraryToggle";
import { ListMenu } from "@/components/library/ListMenu";
import { RatingButtons } from "@/components/library/RatingButtons";
import { PosterLink } from "@/components/PosterLink";
import { BackdropHero, BackdropHeroSkeleton, heroTitle } from "@/components/BackdropHero";
import { HeroLogo } from "@/components/HeroShell";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PosterGrid, PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { getWatchLinks, type WatchLink } from "@/lib/justwatch";
import { setOnWatchlist, setRating, setWatched, type TitleRef } from "@/lib/library/actions";
import { nextEpisode, parseEpisodeKeys, type EpisodeRef } from "@/lib/library/progress";
import { getTitleLibrary } from "@/lib/library/queries";
import {
  cinemaDate,
  getSeasons,
  getTitle,
  img,
  pickLogo,
  yourServicesFirst,
  pickTrailer,
  type MediaType,
  type Title,
  titleMeta,
  getEnglishName,
} from "@/lib/tmdb";
import { Episodes, type SeasonData } from "./components/Episodes";
import { RatingsGrid } from "./components/RatingsGrid";
import { createList, setInList } from "@/lib/lists/actions";
import { getMyListsFor } from "@/lib/lists/queries";
import { Trailer } from "@/components/Trailer";
import { getLanguage, getRegion } from "@/lib/region";
import { getMyServiceIds, getSpoilerGuard } from "@/lib/settings/queries";
import { Suspense } from "react";
import { FriendsOnTitle } from "./components/FriendsOnTitle";

type Library = {
  signedIn: boolean;
  onWatchlist: boolean;
  watched: string[];
  rating: number | null;
  /** yours, with whether this title is on each. Null signed out */
  lists: { id: string; name: string; has: boolean }[] | null;
  ref: TitleRef;
};

export async function TitleView({ type, id }: { type: string; id: string }) {
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) notFound();
  const region = await getRegion();
  const t = await getTitle(type, id, region.lang).catch(() => notFound());
  const name = t.title ?? t.name ?? "";
  const [allLinks, session, myIds] = await Promise.all([
    // JustWatch is searched in English, a translated title would miss it
    getEnglishName(type, t.id)
      .catch(() => name)
      .then((en) => getWatchLinks(type, t.id, en, region.code)),
    getSession(),
    getMyServiceIds(),
  ]);
  const links = yourServicesFirst(allLinks, t, region.code, myIds);
  const [lib, lists] = session
    ? await Promise.all([getTitleLibrary(session.user.id, type, t.id), getMyListsFor(session.user.id, type, t.id)])
    : [{ onWatchlist: false, watched: [], rating: null }, null];
  const library: Library = {
    signedIn: session !== null,
    ...lib,
    lists,
    ref: { type, tmdbId: t.id, title: name, posterPath: t.poster_path },
  };
  const trailer = pickTrailer(t.videos.results);
  // A movie that isn't out yet gets its cinema date instead of a watch button (today is safe to read here,
  // the session above already made this render per request).
  const cinema = type === "movie" ? cinemaDate(t, region.code) : null;
  const inCinemasFrom = cinema && cinema > new Date().toISOString().slice(0, 10) ? cinema : undefined;
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
      <Hero
        t={t}
        type={type}
        name={name}
        links={links}
        trailerKey={trailer?.key}
        library={library}
        next={next}
        inCinemasFrom={inCinemasFrom}
        logo={pickLogo(t, region.lang)}
      />
      <WhereToWatch links={links} fallback={t["watch/providers"].results[region.code]?.link} country={region.name} />
      {session && (
        <Suspense>
          <FriendsOnTitle userId={session.user.id} type={type} tmdbId={t.id} />
        </Suspense>
      )}
      <Container as="main" className="flex flex-col gap-section pt-section">
        {type === "tv" && (
          <Suspense fallback={<div className="h-80 sk rounded-banner" />}>
            <SeasonSections t={t} library={library} next={next} />
          </Suspense>
        )}
        <Cast t={t} />
        {t.recommendations.results.length > 0 && (
          <Section title={`More like ${name}`}>
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

/** Full-bleed backdrop under the top bar, title and actions at the bottom. */
function Hero({
  t,
  type,
  name,
  links,
  trailerKey,
  library,
  next,
  inCinemasFrom,
  logo,
}: {
  t: Title;
  type: MediaType;
  name: string;
  links: WatchLink[];
  trailerKey?: string;
  library: Library;
  next: EpisodeRef | null;
  inCinemasFrom?: string;
  /** the official title logo, like on Home (the plain name when TMDB has none) */
  logo: { path: string; aspectRatio: number } | null;
}) {
  const primary = links[0];
  const watchLabel = primary
    ? `${next ? `S${next.season} E${next.episode}` : primary.included ? "Watch" : "Rent or buy"} on ${primary.service}`
    : null;

  return (
    <BackdropHero backdropPath={t.backdrop_path} transitionName={`title-${type}-${t.id}`}>
      {logo ? (
        <HeroLogo src={img(logo.path, "w500")!} aspectRatio={logo.aspectRatio} name={name} />
      ) : (
        <h1 className={heroTitle}>{name}</h1>
      )}
      <div className="flex flex-wrap items-center gap-x-2 text-label text-fg/80 nums">
        <span>{titleMeta(t, type)}</span>
        {t.vote_average > 0 && (
          <span className="inline-flex items-center gap-1">
            · <Star size={13} strokeWidth={2} aria-hidden /> {t.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      {t.overview && <p className="line-clamp-3 max-w-search text-body leading-normal text-fg/80">{t.overview}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {inCinemasFrom && (
          <span className={buttonStyles("primary", "md", "pointer-events-none")}>
            <Ticket size={16} strokeWidth={2} aria-hidden />
            In cinemas{" "}
            {new Date(inCinemasFrom).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}
          </span>
        )}
        {!inCinemasFrom && primary && watchLabel && (
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
        {library.lists && (
          <ListMenu
            name={library.ref.title}
            lists={library.lists}
            toggle={setInList.bind(null, library.ref)}
            create={createList.bind(null, library.ref)}
          />
        )}
        {type === "movie" && !inCinemasFrom && (
          <LibraryToggle
            kind="watched"
            signedIn={library.signedIn}
            initial={library.watched.includes("0-0")}
            toggle={setWatched.bind(null, { ...library.ref, minutes: t.runtime ?? 0 })}
          />
        )}
        {/* once you've seen it (a series: any episode) */}
        {library.watched.length > 0 && (
          <RatingButtons initial={library.rating} rate={setRating.bind(null, library.ref)} />
        )}
      </div>
    </BackdropHero>
  );
}

/** One quiet line: subscription services first, then a few rent or buy stores. */
function WhereToWatch({ links, fallback, country }: { links: WatchLink[]; fallback?: string; country: string }) {
  const included = links.filter((l) => l.included).slice(0, 4);
  const paid = links.filter((l) => !l.included).slice(0, 3);
  const link = (l: WatchLink) => (
    <a
      key={l.service}
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group glass-hover -mx-2.5 inline-flex h-9 items-center gap-1 rounded-full px-2.5"
    >
      {l.service}
      <ArrowUpRight
        size={14}
        strokeWidth={2}
        aria-hidden
        className="text-muted transition-colors duration-200 group-hover:text-fg"
      />
    </a>
  );

  return (
    <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-label">
      <span className="text-muted">Where to watch</span>
      {links.length === 0 && (
        <span className="text-muted">
          Not streaming in {country} right now.
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

async function SeasonSections({ t, library, next }: { t: Title; library: Library; next: EpisodeRef | null }) {
  const numbers = (t.seasons ?? [])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => s.season_number);
  const [raw, guard] = await Promise.all([getSeasons(String(t.id), numbers, await getLanguage()), getSpoilerGuard()]);
  const seen = new Set(library.watched);
  const seasons: SeasonData[] = raw.map((s) => ({
    number: s.number,
    episodes: s.episodes.map((e) => ({
      n: e.episode_number,
      // spoiler guard: titles of episodes you haven't watched stay hidden (list and ratings grid both use this)
      name: guard && !seen.has(`${s.number}-${e.episode_number}`) ? `Episode ${e.episode_number}` : e.name,
      rating: e.vote_average,
      still: img(e.still_path, "w300"),
      lowStill: img(e.still_path, "w92"),
      runtime: e.runtime,
    })),
  }));
  return (
    <div className="grid grid-cols-1 gap-section lg:grid-cols-main-aside">
      {/* min-w-0: wide content (a show with 60 episodes a season) scrolls inside its column instead of pushing it */}
      <div className="min-w-0">
        <Episodes
          seasons={seasons}
          library={{
            signedIn: library.signedIn,
            watched: library.watched,
            ref: library.ref,
            startSeason: next?.season,
            nextEpisode: next?.episode,
          }}
        />
      </div>
      <div className="min-w-0">
        <RatingsGrid seasons={seasons} watched={library.watched} />
      </div>
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
