"use client";

import { Heart, ThumbsDown, ThumbsUp } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

const choices = [
  { value: -1, icon: ThumbsDown, label: "Not for me" },
  { value: 1, icon: ThumbsUp, label: "I like this" },
  { value: 2, icon: Heart, label: "I love this" },
] as const;

/**
 * Not for me, like, love: one glass pill, the chosen one lit. Same as LibraryToggle: flips instantly, saves in the
 * background, flips back if saving fails. Choosing the lit one again clears it.
 */
export function RatingButtons({
  initial,
  rate,
}: {
  initial: number | null;
  rate: (value: number | null) => Promise<void>;
}) {
  const [saved, setSaved] = useState(initial);
  const [value, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  function choose(v: number) {
    const next = v === value ? null : v;
    startTransition(async () => {
      setOptimistic(next);
      try {
        await rate(next);
        setSaved(next);
      } catch {
        // optimistic state falls back to `saved` when the transition ends
      }
    });
  }

  return (
    <div role="group" aria-label="Your rating" className="flex h-11 items-center rounded-full px-1 glass">
      {choices.map(({ value: v, icon: Icon, label }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            aria-label={on ? `${label}, undo` : label}
            data-tip={label}
            onClick={() => choose(v)}
            className={`flex size-9 press items-center justify-center rounded-full transition-colors ${
              on ? "text-accent" : "text-muted hover:text-fg"
            }`}
          >
            <Icon
              key={String(on)}
              size={18}
              strokeWidth={on ? 2.25 : 1.75}
              fill={on ? "currentColor" : "none"}
              aria-hidden
              className="pop"
            />
          </button>
        );
      })}
    </div>
  );
}
