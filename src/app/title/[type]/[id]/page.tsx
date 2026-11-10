import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { Episodes, type SeasonData } from "@/features/titles/components/Episodes";
import { Heatmap } from "@/features/titles/components/Heatmap";
import { PosterGridSkeleton, PosterLink } from "@/components/PosterLink";
import { TmdbImage } from "@/components/TmdbImage";
import { Trailer } from "@/features/titles/components/Trailer";
import { getWatchLinks, type WatchLink } from "@/lib/justwatch";
import { COUNTRY, getSeasons, getTitle, img, type MediaType, type Title } from "@/lib/tmdb";

export default function TitlePage({ params }: PageProps<"/title/[type]/[id]">) {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      {params.then(({ type, id }) => (
        <TitleContent type={type} id={id} />
      ))}
    </Suspense>
  );
}

async function TitleContent({ type, id }: { type: string; id: string }) {
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
      <main className="mx-auto flex max-w-[1280px] flex-col gap-18 px-8 pt-12 pb-24">
        <WhereToWatch links={links} fallback={t["watch/providers"].results[COUNTRY]?.link} />
        {type === "tv" && (
          <Suspense fallback={<div className="sk h-40 rounded-banner" />}>
            <SeasonSections t={t} />
          </Suspense>
        )}
        <Cast t={t} />
        {t.recommendations.results.length > 0 && (
          <section className="flex flex-col gap-5">
            <h2 className="text-section font-bold">More like this</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
              {t.recommendations.results.slice(0, 12).map((c, i) => (
                <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function meta(t: Title, type: MediaType) {
  const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
  const genres = t.genres.slice(0, 2).map((g) => g.name).join(", ");
  const length =
    type === "tv"
      ? `${t.number_of_seasons} season${t.number_of_seasons === 1 ? "" : "s"}`
      : t.runtime
        ? `${Math.floor(t.runtime / 60)} h ${t.runtime % 60} min`
        : "";
  return [type === "tv" ? "Series" : "Movie", year, genres, length].filter(Boolean).join(" · ");
}

function Hero({ t, type, name, links, trailerKey }: { t: Title; type: MediaType; name: string; links: WatchLink[]; trailerKey?: string }) {
  const backdrop = img(t.backdrop_path, "w1280");
  const primary = links[0];
  return (
    <div className="mx-auto max-w-[1280px] px-8 pt-[88px]">
      <ViewTransition name={`title-${type}-${t.id}`} share="morph" default="none">
        <div className="relative flex min-h-[600px] items-end overflow-hidden rounded-banner bg-raised p-14 max-sm:min-h-[520px] max-sm:p-6">
          {backdrop && (
            <TmdbImage src={backdrop} lowSrc={img(t.backdrop_path, "w300")!} alt="" sizes="(max-width: 1280px) 100vw, 1280px" priority />
          )}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-b from-bg/0 to-bg/85" />
          <div className="relative flex max-w-[700px] flex-col gap-4">
            <span className="text-[15px] text-fg/80">{meta(t, type)}</span>
            <h1 className="text-hero leading-[0.92] font-bold tracking-[-0.05em] max-sm:text-page">{name}</h1>
            {t.overview && <p className="line-clamp-3 text-lg leading-normal text-fg/80">{t.overview}</p>}
            <div className="mt-2 flex flex-wrap gap-3">
              {primary && (
                <a
                  href={primary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press flex h-12 items-center gap-2 rounded-full bg-fg px-6 text-base font-semibold text-bg"
                >
                  {primary.included ? "Watch" : "Rent or buy"} on {primary.service}
                  <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
                </a>
              )}
              {trailerKey && <Trailer youtubeKey={trailerKey} title={name} />}
            </div>
          </div>
        </div>
      </ViewTransition>
    </div>
  );
}

function WhereToWatch({ links, fallback }: { links: WatchLink[]; fallback?: string }) {
  const included = links.filter((l) => l.included);
  const paid = links.filter((l) => !l.included);
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-section font-bold">Where to watch in Germany</h2>
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
                      className="press flex h-11 items-center gap-1.5 rounded-full bg-raised px-5 text-[15px] font-semibold"
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
    </section>
  );
}

async function SeasonSections({ t }: { t: Title }) {
  const numbers = (t.seasons ?? []).filter((s) => s.season_number > 0 && s.episode_count > 0).map((s) => s.season_number);
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
    <section className="flex flex-col gap-5">
      <h2 className="text-section font-bold">Cast</h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-6">
        {cast.map((c) => (
          <li key={c.id} className="flex flex-col items-center gap-2.5 text-center">
            <div className="relative size-28 overflow-hidden rounded-full bg-raised">
              {c.profile_path && (
                <Image src={img(c.profile_path, "w185")!} alt="" fill sizes="112px" className="object-cover" />
              )}
            </div>
            <span className="text-small font-semibold">{c.name}</span>
            <span className="-mt-1.5 text-[13px] text-muted">{c.character}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TitleSkeleton() {
  return (
    <>
      <div className="mx-auto max-w-[1280px] px-8 pt-[88px]">
        <div className="sk min-h-[600px] rounded-banner" />
      </div>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-8 pt-12">
        <div className="sk h-8 w-72 rounded-lg" />
        <PosterGridSkeleton count={6} />
      </main>
    </>
  );
}
