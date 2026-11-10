import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { getTopInCountry } from "@/lib/justwatch";
import { getTitle, img } from "@/lib/tmdb";

/** The 10 most watched titles in Germany right now, big rank numbers, scrolls sideways. */
export async function TopTen() {
  const top = await getTopInCountry();
  const loaded = await Promise.all(
    top.map(({ type, tmdbId }) =>
      getTitle(type, String(tmdbId))
        .then((t) => ({ t, type }))
        .catch(() => null),
    ),
  );
  const titles = loaded.filter((x): x is NonNullable<typeof x> => x !== null && x.t.poster_path !== null);
  if (titles.length < 5) return null;

  return (
    <Section title="Top 10 in Germany" description="Most watched this week across streaming services.">
      <ol className="-mx-4 -my-5 flex snap-x gap-2 overflow-x-auto overflow-y-hidden px-4 py-5 sm:-mx-12 sm:px-12">
        {titles.slice(0, 10).map(({ t, type }, i) => (
          <li key={`${type}-${t.id}`} className="shrink-0 snap-start">
            <Link
              href={`/title/${type}/${t.id}`}
              aria-label={`${i + 1}. ${t.title ?? t.name}`}
              className="group flex items-end"
            >
              <span aria-hidden className="-mr-3 text-hero leading-display font-bold tracking-display text-fg/15 nums">
                {i + 1}
              </span>
              <div className="relative aspect-poster w-36 lift overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
                <Image src={img(t.poster_path, "w342")!} alt="" fill sizes="144px" className="object-cover" />
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}
