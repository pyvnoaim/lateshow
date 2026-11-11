"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

export type Contender = { id: number; title: string; meta: string; poster: string };

/**
 * Two posters, tap the one you'd rather watch. Your pick gets the blue ring and the other fades at once; the next
 * match comes when everyone voted (the page refreshes live). Keyed by match, so each match starts fresh.
 */
export function BracketVote({
  code,
  match,
  pair,
  picked,
  waitingFor,
  pick,
}: {
  code: string;
  match: number;
  pair: [Contender, Contender];
  picked: number | null;
  waitingFor: string[];
  pick: (code: string, vote: { match: number; choice: number }) => Promise<void>;
}) {
  const [mine, setMine] = useState(picked);
  const [, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-center gap-5 sm:gap-10">
        {pair.map((c, i) => (
          <div key={c.id} className="contents">
            {i === 1 && (
              <span aria-hidden className="hidden text-section font-bold text-muted sm:block">
                or
              </span>
            )}
            <button
              type="button"
              aria-pressed={mine === c.id}
              aria-label={`Vote for ${c.title}`}
              onClick={() => {
                setMine(c.id);
                startTransition(() => pick(code, { match, choice: c.id }));
              }}
              className={`group flex max-w-72 min-w-0 flex-1 flex-col gap-3.5 text-left transition-opacity duration-300 ${mine !== null && mine !== c.id ? "opacity-35" : ""}`}
            >
              <span
                className={`relative aspect-poster lift overflow-hidden rounded-banner bg-raised outline-1 -outline-offset-1 outline-hairline ${mine === c.id ? "ring-3 ring-accent" : ""}`}
              >
                <Image src={c.poster} alt="" fill sizes="(max-width: 640px) 45vw, 288px" className="object-cover" />
              </span>
              <span>
                <span className="block text-body font-semibold">{c.title}</span>
                <span className="block pt-1 text-small text-muted">{c.meta}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
      <p aria-live="polite" className="text-center text-small text-muted">
        {mine === null
          ? "Tap the one you'd rather watch."
          : waitingFor.length > 0
            ? `Waiting for ${waitingFor.join(" and ")}.`
            : "Counting."}
      </p>
    </div>
  );
}
