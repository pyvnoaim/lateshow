"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollBox } from "@/components/ScrollBox";
import { LibraryToggle } from "@/components/library/LibraryToggle";
import { TmdbImage } from "@/components/TmdbImage";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { setEarlierWatched, setWatched, type TitleRef } from "@/lib/library/actions";
import { buttonStyles } from "@/components/ui/button";
import { earlierText } from "@/lib/library/earlier";

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
  // after you check episode n: the earlier ones of that season still open, to offer marking them too
  const [ask, setAsk] = useState<{ season: number; after: number; missing: { n: number; minutes: number }[] } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  // episodes checked here that the server's list doesn't know yet (its refresh can lag a quick second check)
  const checked = useRef(new Set<string>());
  useEffect(() => {
    if (!ask || saving) return;
    const t = setTimeout(() => setAsk(null), 6000);
    return () => clearTimeout(t);
  }, [ask, saving]);
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
              {ask && ask.season === season.number && ask.after === e.n ? (
                // the question takes the runtime's place in the row: quiet, and gone after an answer or a few seconds
                <span className="flex shrink-0 rise items-center gap-2 text-caption text-muted">
                  {earlierText(ask.missing.map((m) => m.n))}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await setEarlierWatched(library.ref, ask.season, ask.missing);
                        for (const m of ask.missing) checked.current.add(`${ask.season}-${m.n}`);
                      } catch {
                        // signed out or offline: the question goes, the episodes stay as they were
                      } finally {
                        setSaving(false);
                        setAsk(null);
                      }
                    }}
                    className={buttonStyles("text", "text", "text-caption text-fg")}
                  >
                    Yes
                  </button>
                  <span aria-hidden>·</span>
                  <button
                    type="button"
                    onClick={() => setAsk(null)}
                    className={buttonStyles("text", "text", "text-caption")}
                  >
                    No
                  </button>
                </span>
              ) : e.runtime ? (
                <span className="text-caption text-muted nums">{e.runtime} min</span>
              ) : null}
              <LibraryToggle
                // remounts when the server's answer changes (the episodes "too?" marked come back checked)
                key={String(watched.has(`${season.number}-${e.n}`))}
                kind="watched"
                size="iconSm"
                signedIn={library.signedIn}
                initial={watched.has(`${season.number}-${e.n}`)}
                toggle={async (on) => {
                  await setWatched(
                    { ...library.ref, season: season.number, episode: e.n, minutes: e.runtime ?? 0 },
                    on,
                  );
                  const key = `${season.number}-${e.n}`;
                  if (on) checked.current.add(key);
                  else checked.current.delete(key);
                  const missing = on
                    ? season.episodes
                        .filter((x) => {
                          const k = `${season.number}-${x.n}`;
                          return x.n < e.n && !watched.has(k) && !checked.current.has(k);
                        })
                        .map((x) => ({ n: x.n, minutes: x.runtime ?? 0 }))
                    : [];
                  setAsk(missing.length > 0 ? { season: season.number, after: e.n, missing } : null);
                }}
              />
            </li>
          ))}
        </ol>
      </ScrollBox>
    </Section>
  );
}
