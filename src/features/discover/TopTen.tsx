import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { getTopInCountry } from "@/lib/justwatch";
import { getTitle, img, subscriptionServices } from "@/lib/tmdb";
import { getRegion } from "@/lib/region";

/** The 10 most watched titles in your country right now, big rank numbers, scrolls sideways. */
export async function TopTen() {
  const { code, name } = await getRegion();
  const top = await getTopInCountry(code);
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
    <Section title={`Top 10 in ${name}`} description="Most watched this week across streaming services.">
      <ol className="-mx-4 -my-5 flex snap-x gap-2 overflow-x-auto overflow-y-hidden px-4 py-5 sm:-mx-12 sm:px-12">
        {titles.slice(0, 10).map(({ t, type }, i) => (
          <li key={`${type}-${t.id}`} className="shrink-0 snap-start">
            <Link
              href={`/title/${type}/${t.id}`}
              aria-label={`${i + 1}. ${t.title ?? t.name}`}
              className="group flex items-end"
            >
              <span
                aria-hidden
                className="-mr-3 pb-13.5 text-hero leading-display font-bold tracking-display text-fg/15 nums"
              >
                {i + 1}
              </span>
              <div className="flex w-36 flex-col gap-2.5">
                <div className="relative aspect-poster lift overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
                  <Image src={img(t.poster_path, "w342")!} alt="" fill sizes="144px" className="object-cover" />
                </div>
                <span className="truncate text-label font-medium">{t.title ?? t.name}</span>
                {/* nbsp keeps every column the same height when there's no service */}
                <span className="-mt-2 truncate text-caption text-muted">
                  {subscriptionServices(t, code)[0]?.name ?? "\u00a0"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}
