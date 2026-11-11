import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getTitle, getTrending, subscriptionServices, type Kind } from "@/lib/tmdb";
import { getRegion } from "@/lib/region";
import { homeHref, readHome, type HomeSearch } from "./params";

const TABS: { kind: Kind; label: string; param?: string }[] = [
  { kind: "all", label: "All" },
  { kind: "movie", label: "Movies", param: "movie" },
  { kind: "tv", label: "Series", param: "series" },
];

// ponytail: "My services" tab comes with the service picker in settings.
export async function Trending({ searchParams }: { searchParams: Promise<HomeSearch> }) {
  const current = readHome(await searchParams);
  const active = TABS.find((t) => t.param === current.trending) ?? TABS[0];
  const cards = (await getTrending(active.kind)).slice(0, 12);
  const { code } = await getRegion();
  // ponytail: one cached title lookup per poster (12), the same data the title page uses.
  const services = await Promise.all(
    cards.map((c) =>
      getTitle(c.media_type, String(c.id))
        .then((t) => subscriptionServices(t, code)[0])
        .catch(() => undefined),
    ),
  );

  return (
    <Section
      title="Trending"
      aside={
        <SegmentedTabs
          label="Trending filter"
          items={TABS.map((t) => ({
            key: t.kind,
            label: t.label,
            active: t === active,
            href: homeHref(current, { trending: t.param }),
          }))}
        />
      }
    >
      <PosterGrid>
        {cards.map((c, i) => (
          <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} service={services[i]} />
        ))}
      </PosterGrid>
    </Section>
  );
}
