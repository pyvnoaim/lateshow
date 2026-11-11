"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollBox } from "@/components/ScrollBox";
import { LibraryToggle } from "@/components/library/LibraryToggle";
import { TmdbImage } from "@/components/TmdbImage";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { setWatched, type TitleRef } from "@/lib/library/actions";

export type SeasonData = {
  number: number;
  episodes: {
    n: number;
    name: string;
    rating: number;
    still: string | null;
    lowStill: string | null;
    runtime: number | null;
  }[];
};

export type EpisodeLibrary = {
  signedIn: boolean;
  watched: string[];
  ref: TitleRef;
  startSeason?: number;
  /** Episode number of your next episode in startSeason: the list opens scrolled to it. */
  nextEpisode?: number;
};

export function Episodes({ seasons, library }: { seasons: SeasonData[]; library: EpisodeLibrary }) {
  const [active, setActive] = useState(library.startSeason ?? seasons[0]?.number);
  const list = useRef<HTMLDivElement>(null);

  // Open on your next episode instead of episode 1 (only inside the list, the page itself doesn't move).
  useEffect(() => {
    const row = list.current?.querySelector<HTMLElement>("[data-next]");
    if (row && list.current) list.current.scrollTop = row.offsetTop - 12;
  }, []);
  const season = seasons.find((s) => s.number === active) ?? seasons[0];
  if (!season) return null;
  const watched = new Set(library.watched);

  return (
    <Section
      title="Episodes"
      aside={
        <SegmentedTabs
          label="Seasons"
          items={seasons.map((s) => ({
            key: String(s.number),
            label: String(s.number),
            active: s.number === season.number,
            onSelect: () => setActive(s.number),
          }))}
        />
      }
    >
      <ScrollBox boxRef={list} className="max-h-list">
        <ol className="flex flex-col">
          {season.episodes.map((e, i) => (
            <li
              key={`${season.number}-${e.n}`}
              data-next={season.number === library.startSeason && e.n === library.nextEpisode ? "" : undefined}
              className="flex rise items-center gap-4 py-2"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-thumb bg-raised">
                {e.still && e.lowStill && <TmdbImage src={e.still} lowSrc={e.lowStill} alt="" sizes="96px" />}
              </div>
              <span className="w-6 text-small text-muted nums">{e.n}</span>
              <span className="min-w-0 flex-1 truncate text-label font-medium">{e.name}</span>
              {e.runtime ? <span className="text-caption text-muted nums">{e.runtime} min</span> : null}
              <LibraryToggle
                kind="watched"
                size="iconSm"
                signedIn={library.signedIn}
                initial={watched.has(`${season.number}-${e.n}`)}
                toggle={(on) =>
                  setWatched({ ...library.ref, season: season.number, episode: e.n, minutes: e.runtime ?? 0 }, on)
                }
              />
            </li>
          ))}
        </ol>
      </ScrollBox>
    </Section>
  );
}
