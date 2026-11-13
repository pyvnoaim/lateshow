"use client";

import { useOptimistic, useTransition } from "react";

/** An on/off switch for one setting. Flips at once, saves in the background, flips back if saving fails. */
export function Toggle({ label, on, save }: { label: string; on: boolean; save: (on: boolean) => Promise<void> }) {
  const [shown, setShown] = useOptimistic(on);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          setShown(!shown);
          await save(!shown);
        })
      }
      className={`flex h-8 w-13 shrink-0 press items-center rounded-full p-1 transition-colors duration-200 ${shown ? "bg-accent" : "glass-cell"}`}
    >
      <span
        aria-hidden
        className={`size-6 rounded-full bg-fg shadow-md transition-transform duration-200 ${shown ? "translate-x-5" : ""}`}
      />
    </button>
  );
}
