"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import type { TitleRef } from "@/lib/library/actions";

/** ✓ (movies: watched, which also takes it off the list) and × (remove), at the end of a card's caption. */
export function ItemActions({
  titleRef,
  minutes,
  watched,
  remove,
}: {
  titleRef: TitleRef;
  minutes: number | null;
  watched: ((ref: TitleRef & { minutes?: number }, on: boolean) => Promise<void>) | null;
  remove: (ref: TitleRef, on: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const icon = "press -m-1.5 rounded-full p-1.5 text-muted transition-colors hover:text-fg disabled:opacity-40";
  return (
    <span className="flex shrink-0 items-center gap-2">
      {watched && (
        <button
          type="button"
          disabled={pending}
          aria-label={`Mark ${titleRef.title} as watched`}
          data-tip="Watched"
          data-tip-meta="Takes it off the list"
          onClick={() => startTransition(() => watched({ ...titleRef, minutes: minutes ?? 0 }, true))}
          className={icon}
        >
          <Check size={15} strokeWidth={2.25} aria-hidden />
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label={`Remove ${titleRef.title} from your watchlist`}
        data-tip="Remove"
        onClick={() => startTransition(() => remove(titleRef, false))}
        className={icon}
      >
        <X size={15} strokeWidth={2.25} aria-hidden />
      </button>
    </span>
  );
}
