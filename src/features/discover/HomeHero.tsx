import { getSession } from "@/lib/auth";
import { HeroCarousel, type HeroSlide } from "@/components/HeroCarousel";
import { setOnWatchlist } from "@/lib/library/actions";
import { getTitleLibrary } from "@/lib/library/queries";
import { getTitle, getTrending, img, pickLogo, pickTrailer, titleMeta } from "@/lib/tmdb";
import { getLanguage } from "@/lib/region";

/** This week's top trending titles, rotating. Your show in progress lives in the top bar (UpNext), not here. */
export async function HomeHero() {
  const session = await getSession();
  return <Featured userId={session?.user.id} />;
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
