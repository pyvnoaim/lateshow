import { Shuffle } from "lucide-react";
import Link from "next/link";
import { PosterLink } from "@/components/PosterLink";
import { buttonStyles } from "@/components/ui/button";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { discoverOnSubscription } from "@/lib/tmdb";
import { homeHref, readHome, type HomeSearch } from "./params";
import { pick } from "./pick";
import { getRegion } from "@/lib/region";

const PAGES = 5; // picks come from the 100 most popular well rated titles on subscription

/** "Can't decide?": Movie or Series first, then three picks. Each "Give me 3" is a new roll in the URL. */
export async function Decide({ searchParams }: { searchParams: Promise<HomeSearch> }) {
  const [current, region] = [readHome(await searchParams), await getRegion()];
  const type = current.decide === "series" ? "tv" : "movie";
  const roll = Number(current.roll) || 0;
  const picks =
    roll > 0 ? pick(await discoverOnSubscription(type, ((roll - 1) % PAGES) + 1, region.code), 3, roll) : [];

  return (
    <Section
      title="Can't decide?"
      description={`Three picks that are on a subscription in ${region.name}.`}
      asideAt="end"
      aside={
        <div className="flex flex-wrap items-center gap-6">
          <SegmentedTabs
            label="Pick a movie or a series"
            items={[
              {
                key: "movie",
                label: "Movie",
                active: type === "movie",
                href: homeHref(current, { decide: undefined, roll: undefined }),
              },
              {
                key: "series",
                label: "Series",
                active: type === "tv",
                href: homeHref(current, { decide: "series", roll: undefined }),
              },
            ]}
          />
          <Link
            href={homeHref(current, { roll: String(roll + 1) })}
            scroll={false}
            className={buttonStyles("primary", "sm")}
          >
            <Shuffle size={16} strokeWidth={2} aria-hidden />
            {roll > 0 ? "Three more" : "Give me 3"}
          </Link>
        </div>
      }
    >
      {picks.length > 0 && (
        <PosterGrid>
          {picks.map((c, i) => (
            <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} morph={false} />
          ))}
        </PosterGrid>
      )}
    </Section>
  );
}
