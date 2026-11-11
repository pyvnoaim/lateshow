"use client";

import { Check, Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setOnWatchlist, type TitleRef } from "@/lib/library/actions";

/**
 * The quiet + at the end of a poster's caption line (posters stay clean, actions live in the caption). Flips at once
 * to a blue ✓ and saves in the background. `label` shows text instead ("Remind me" on cinema posters).
 */
export function WatchlistPlus({
  titleRef,
  initial,
  label,
}: {
  titleRef: TitleRef;
  initial: boolean;
  label?: [string, string];
}) {
  const [saved, setSaved] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    // the server's state changed (another + for the same title, the watchlist page, the title page): follow it
    setSeen(initial);
    setSaved(initial);
  }
  const [on, setOn] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const name = titleRef.title;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `${name} is on your watchlist, remove` : `Add ${name} to your watchlist`}
      data-tip={label ? undefined : on ? "On your watchlist" : "Add to watchlist"}
      onClick={(e) => {
        e.preventDefault(); // it may sit next to a link
        const next = !on;
        startTransition(async () => {
          setOn(next);
          try {
            await setOnWatchlist(titleRef, next);
            setSaved(next);
          } catch {
            // not saved (signed out meanwhile): the optimistic flip falls back on its own
          }
        });
      }}
      className={`-m-1.5 inline-flex shrink-0 press items-center gap-1 rounded-full p-1.5 transition-colors ${on ? "text-accent" : "text-muted hover:text-fg"}`}
    >
      {on ? (
        <Check size={14} strokeWidth={2.5} aria-hidden className="pop" />
      ) : (
        <Plus size={14} strokeWidth={2.25} aria-hidden />
      )}
      {label && <span className="text-caption">{on ? label[1] : label[0]}</span>}
    </button>
  );
}
