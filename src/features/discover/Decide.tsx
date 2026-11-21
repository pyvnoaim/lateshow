import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { discoverOnSubscription } from "@/lib/tmdb";
import { homeHref, readHome, type HomeSearch } from "./params";
import { deal } from "./pick";
import { getRegion } from "@/lib/region";
import { getMyServiceIds } from "@/lib/settings/queries";
import { getMyWatchedKeys } from "@/lib/library/queries";
import { DecideCard } from "./components/DecideCard";
import { RollButton } from "./components/RollButton";

const PAGES = 5; // picks come from the 100 most popular well rated titles on subscription, minus what you watched

/** "Can't decide?": Movie or Series first, then three picks. Each "Give me 3" is a new roll in the URL. */
export async function Decide({ searchParams }: { searchParams: Promise<HomeSearch> }) {
  const [current, region] = [readHome(await searchParams), await getRegion()];
  const type = current.decide === "series" ? "tv" : "movie";
  const roll = Number(current.roll) || 0;
  const mine = await getMyServiceIds();
  const [pages, seen] =
    roll > 0
      ? await Promise.all([
          Promise.all(
            Array.from({ length: PAGES }, (_, i) =>
              discoverOnSubscription(type, i + 1, region.code, mine, region.lang).catch(() => []),
            ),
          ),
          getMyWatchedKeys(),
        ])
      : [[], null];
  const pool = pages.flat().filter((c) => !seen?.has(`${c.media_type}-${c.id}`));
  // A new shuffle every day, the same one all day (rolls stay shareable, caches stay warm).
  const picks = deal(pool, 3, roll, Math.floor(new Date().getTime() / 86_400_000));

  return (
    // group: while the next roll loads (RollButton's data-pending) the old picks sink away
    <div className="group/decide">
      <Section
        title="Can't decide?"
        description={
          mine.length > 0
            ? "Three picks from your services."
            : `Three picks that are on a subscription in ${region.name}.`
        }
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
            <RollButton
              href={homeHref(current, { roll: String(roll + 1) })}
              label={roll > 0 ? "Three more" : "Give me 3"}
            />
          </div>
        }
      >
        {picks.length > 0 && (
          // three wide picks fill the row. Keyed by the roll: each roll deals its cards in fresh
          <div
            key={`${type}-${roll}`}
            className="grid grid-cols-1 gap-x-5 gap-y-8 transition duration-300 ease-out group-has-data-pending/decide:translate-y-2 group-has-data-pending/decide:scale-98 group-has-data-pending/decide:opacity-30 md:grid-cols-3"
          >
            {picks.map((c, i) => (
              <DecideCard key={`${c.media_type}-${c.id}`} card={c} index={i} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
