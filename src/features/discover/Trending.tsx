import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getRegion } from "@/lib/region";
import { getMyServiceIds } from "@/lib/settings/queries";
import { getOnMyServices, getTrending, type Kind } from "@/lib/tmdb";
import { homeHref, readHome, type HomeSearch } from "./params";

const TABS: { kind: Kind | "mine"; label: string; param?: string }[] = [
  { kind: "all", label: "All" },
  { kind: "movie", label: "Movies", param: "movie" },
  { kind: "tv", label: "Series", param: "series" },
  { kind: "mine", label: "My services", param: "mine" },
];

export async function Trending({ searchParams }: { searchParams: Promise<HomeSearch> }) {
  const current = readHome(await searchParams);
  const mine = await getMyServiceIds();
  // "My services" only shows once you picked some in settings.
  const tabs = mine.length > 0 ? TABS : TABS.filter((t) => t.kind !== "mine");
  const active = tabs.find((t) => t.param === current.trending) ?? tabs[0];
  const { code, lang } = await getRegion();
  const cards = (
    active.kind === "mine" ? await getOnMyServices("all", mine, code, lang) : await getTrending(active.kind, 1, lang)
  ).slice(0, 12);

  return (
    <Section
      title="Trending"
      aside={
        <SegmentedTabs
          label="Trending filter"
          items={tabs.map((t) => ({
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
          <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
        ))}
      </PosterGrid>
    </Section>
  );
}
