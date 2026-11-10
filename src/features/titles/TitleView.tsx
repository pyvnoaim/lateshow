import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { PosterLink } from "@/components/PosterLink";
import { TmdbImage } from "@/components/TmdbImage";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PosterGrid, PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getWatchLinks, type WatchLink } from "@/lib/justwatch";
import { COUNTRY, getSeasons, getTitle, img, type MediaType, type Title } from "@/lib/tmdb";
import { Episodes, type SeasonData } from "./components/Episodes";
import { Heatmap } from "./components/Heatmap";
import { Trailer } from "./components/Trailer";

export async function TitleView({ type, id }: { type: string; id: string }) {
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) notFound();
  const t = await getTitle(type, id).catch(() => notFound());
  const name = t.title ?? t.name ?? "";
  const links = await getWatchLinks(type, t.id, name);
  const trailer =
    t.videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    t.videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer");

  return (
    <>
      <Hero t={t} type={type} name={name} links={links} trailerKey={trailer?.key} />
      <Container as="main" className="flex flex-col gap-section pt-12">
        <WhereToWatch links={links} fallback={t["watch/providers"].results[COUNTRY]?.link} />
        {type === "tv" && (
          <Suspense fallback={<div className="h-40 sk rounded-banner" />}>
            <SeasonSections t={t} />
          </Suspense>
        )}
        <Cast t={t} />
        {t.recommendations.results.length > 0 && (
          <Section title="More like this">
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
  return [type === "tv" ? "Series" : "Movie", year, genres, length].filter(Boolean).join(" · ");
}

function Hero({
  t,
  type,
  name,
  links,
  trailerKey,
}: {
  t: Title;
  type: MediaType;
  name: string;
  links: WatchLink[];
  trailerKey?: string;
}) {
  const backdrop = img(t.backdrop_path, "w1280");
  const primary = links[0];
  return (
    <Container className="pt-bar">
      <ViewTransition name={`title-${type}-${t.id}`} share="morph" default="none">
        <div className="relative flex min-h-hero items-end overflow-hidden rounded-banner bg-raised p-14 max-sm:min-h-hero-sm max-sm:p-6">
          {backdrop && (
            <TmdbImage
              src={backdrop}
              lowSrc={img(t.backdrop_path, "w300")!}
              alt=""
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-b from-bg/0 to-bg/85" />
          <div className="relative flex max-w-hero-text flex-col gap-4">
            <span className="text-label text-fg/80">{meta(t, type)}</span>
            <h1 className="text-hero leading-display font-bold tracking-display max-sm:text-page">{name}</h1>
            {t.overview && <p className="line-clamp-3 text-lg leading-normal text-fg/80">{t.overview}</p>}
            <div className="mt-2 flex flex-wrap gap-3">
              {primary && (
                <a href={primary.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary")}>
                  {primary.included ? "Watch" : "Rent or buy"} on {primary.service}
                  <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
                </a>
              )}
              {trailerKey && <Trailer youtubeKey={trailerKey} title={name} />}
            </div>
          </div>
        </div>
      </ViewTransition>
    </Container>
  );
}

function WhereToWatch({ links, fallback }: { links: WatchLink[]; fallback?: string }) {
  const included = links.filter((l) => l.included);
  const paid = links.filter((l) => !l.included);
  return (
    <Section title="Where to watch in Germany">
      {links.length === 0 ? (
        <p className="text-body text-muted">
          Not streaming in Germany right now.
          {fallback && (
            <>
              {" "}
              <a href={fallback} target="_blank" rel="noopener noreferrer" className="text-accent">
                Check rent and buy options
              </a>
            </>
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[
            ["Included with subscription", included],
            ["Rent or buy", paid],
          ].map(([label, list]) =>
            (list as WatchLink[]).length ? (
              <div key={label as string} className="flex flex-col gap-2.5">
                <span className="text-small text-muted">{label as string}</span>
                <div className="flex flex-wrap gap-2.5">
                  {(list as WatchLink[]).map((l) => (
                    <a
                      key={l.service}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles("quiet", "sm")}
                    >
                      {l.service}
                      <ArrowUpRight size={16} strokeWidth={2} className="text-muted" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Section>
  );
}

async function SeasonSections({ t }: { t: Title }) {
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
    <>
      <Heatmap seasons={seasons} />
      <Episodes seasons={seasons} />
    </>
  );
}

function Cast({ t }: { t: Title }) {
  const cast = t.credits.cast.slice(0, 12);
  if (cast.length === 0) return null;
  return (
    <Section title="Cast">
      <ul className="grid grid-cols-cast gap-6">
        {cast.map((c) => (
          <li key={c.id} className="flex flex-col items-center gap-2.5 text-center">
            <div className="relative size-28 overflow-hidden rounded-full bg-raised">
              {c.profile_path && (
                <Image src={img(c.profile_path, "w185")!} alt="" fill sizes="112px" className="object-cover" />
              )}
            </div>
            <span className="text-small font-semibold">{c.name}</span>
            <span className="-mt-1.5 text-caption text-muted">{c.character}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function TitleSkeleton() {
  return (
    <>
      <Container className="pt-bar">
        <div className="min-h-hero sk rounded-banner" />
      </Container>
      <Container className="flex flex-col gap-6 pt-12">
        <div className="h-8 w-72 sk rounded-lg" />
        <PosterGridSkeleton count={6} />
      </Container>
    </>
  );
}
