"use client";

import { Check, Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { setOnWatchlist, type TitleRef } from "@/lib/library/actions";

/**
 * The quiet + at the end of a poster's caption line (touch screens), or a small glass button over the poster on hover (mouse). Flips at once
 * to an accent ✓ and saves in the background.
 */
export function WatchlistPlus({
  titleRef,
  initial,
  variant = "caption",
}: {
  titleRef: TitleRef;
  initial: boolean;
  /** caption: quiet icon in the caption line. overlay: small glass button over the poster (hover) */
  variant?: "caption" | "overlay";
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
      data-tip={on ? "On your watchlist" : "Add to watchlist"}
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
      className={
        variant === "overlay"
          ? buttonStyles(on ? "deepOn" : "deep", "iconSm")
          : `-m-1.5 inline-flex shrink-0 press items-center gap-1 rounded-full p-1.5 transition-colors ${on ? "text-accent" : "text-muted hover:text-fg"}`
      }
    >
      {on ? (
        <Check size={14} strokeWidth={2.5} aria-hidden className="pop" />
      ) : (
        <Plus size={14} strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
