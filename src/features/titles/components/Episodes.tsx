"use client";

import { useState } from "react";
import { TmdbImage } from "@/components/TmdbImage";
import { Section } from "@/components/ui/Section";

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

export function Episodes({ seasons }: { seasons: SeasonData[] }) {
  const [active, setActive] = useState(seasons[0]?.number);
  const season = seasons.find((s) => s.number === active) ?? seasons[0];
  if (!season) return null;
  return (
    <Section
      title="Episodes"
      aside={
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Seasons">
          {seasons.map((s) => (
            <button
              key={s.number}
              role="tab"
              aria-selected={s.number === season.number}
              onClick={() => setActive(s.number)}
              className={`h-9 press rounded-full px-4 text-small font-semibold transition-colors ${
                s.number === season.number ? "bg-fg text-bg" : "text-muted hover:text-fg"
              }`}
            >
              Season {s.number}
            </button>
          ))}
        </div>
      }
    >
      <ol className="flex flex-col" role="tabpanel">
        {season.episodes.map((e, i) => (
          <li
            key={e.n}
            className="flex rise items-center gap-5 py-4"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-thumb bg-raised">
              {e.still && e.lowStill && <TmdbImage src={e.still} lowSrc={e.lowStill} alt="" sizes="160px" />}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-caption text-muted">Episode {e.n}</span>
              <span className="text-body font-semibold">{e.name}</span>
              <span className="text-small text-muted nums">
                {e.rating > 0 ? `Rated ${e.rating.toFixed(1)}` : "Not rated yet"}
                {e.runtime ? ` · ${e.runtime} min` : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
