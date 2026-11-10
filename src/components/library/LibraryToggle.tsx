"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { buttonStyles, type ButtonSize } from "@/components/ui/button";

const kinds = {
  watchlist: { icon: Plus, onIcon: Check, off: "Add to watchlist", on: "On your watchlist, remove" },
  watched: { icon: Check, onIcon: Check, off: "Mark as watched", on: "Watched, undo" },
} as const;

/**
 * Round on/off button for library state. Flips instantly, saves in the background, flips back if saving fails.
 * Signed out it becomes a link to sign in, same look.
 */
export function LibraryToggle({
  kind,
  initial,
  toggle,
  signedIn,
  size = "icon",
  offTone = "glass",
}: {
  kind: keyof typeof kinds;
  initial: boolean;
  toggle: (on: boolean) => Promise<void>;
  signedIn: boolean;
  size?: Extract<ButtonSize, "icon">;
  offTone?: "glass" | "raised";
}) {
  const k = kinds[kind];
  const [saved, setSaved] = useState(initial);
  const [on, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const Icon = on ? k.onIcon : k.icon;

  if (!signedIn) {
    return (
      <Link href="/login" aria-label={`${k.off} (sign in first)`} className={buttonStyles(offTone, size)}>
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </Link>
    );
  }

  function flip() {
    const next = !on;
    startTransition(async () => {
      setOptimistic(next);
      try {
        await toggle(next);
        setSaved(next);
      } catch {
        // optimistic state falls back to `saved` when the transition ends
      }
    });
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? k.on : k.off}
      onClick={flip}
      className={buttonStyles(on ? "accent" : offTone, size)}
    >
      <Icon key={String(on)} size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden className="pop" />
    </button>
  );
}
