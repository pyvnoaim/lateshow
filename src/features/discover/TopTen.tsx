import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { getTopInCountry } from "@/lib/justwatch";
import { PosterHoverActions } from "@/components/PosterActions";
import { PosterCaption } from "@/components/PosterCaption";
import { getTitle, img, titleToCard } from "@/lib/tmdb";
import { getRegion } from "@/lib/region";

/** The 10 most watched titles in your country right now, big rank numbers, scrolls sideways. */
export async function TopTen() {
  const { code, name, lang } = await getRegion();
  const top = await getTopInCountry(code);
  const loaded = await Promise.all(
    top.map(({ type, tmdbId }) =>
      getTitle(type, String(tmdbId), lang)
        .then((t) => ({ t, type }))
        .catch(() => null),
    ),
  );
  const titles = loaded.filter((x): x is NonNullable<typeof x> => x !== null && x.t.poster_path !== null);
  if (titles.length < 5) return null;

  return (
    <Section title={`Top 10 in ${name}`} description="Most watched this week across streaming services.">
      <div className="relative">
        <ol className="bleed -my-5 flex snap-x scroll-px-4 no-scrollbar gap-2 overflow-x-auto overflow-y-hidden py-5 sm:scroll-px-12 lg:snap-none">
          {titles.slice(0, 10).map(({ t, type }, i) => (
            <li key={`${type}-${t.id}`} className="flex shrink-0 snap-start items-end">
              <span
                aria-hidden
                className="-mr-3 pb-13.5 text-hero leading-display font-bold tracking-display text-fg/15 nums"
              >
                {i + 1}
              </span>
              {/* the caption and the hover buttons sit next to the link, never inside it */}
              <div className="group relative flex w-36 flex-col gap-2.5 sm:w-44">
                <Link
                  href={`/title/${type}/${t.id}`}
                  aria-label={`${i + 1}. ${t.title ?? t.name}`}
                  className="group flex flex-col gap-2.5 rounded-poster"
                >
                  <div className="relative aspect-poster lift overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
                    <Image src={img(t.poster_path, "w342")!} alt="" fill sizes="176px" className="object-cover" />
                  </div>
                  <span className="truncate text-label font-medium">{t.title ?? t.name}</span>
                </Link>
                <PosterHoverActions card={titleToCard(t, type)} />
                <PosterCaption card={titleToCard(t, type)} />
              </div>
            </li>
          ))}
        </ol>
        {/* the row runs to the screen edge but fades there: still reads as more, and stays clear of the scrollbar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 edge-end w-20 bg-linear-to-l from-bg to-transparent"
        />
      </div>
    </Section>
  );
}
