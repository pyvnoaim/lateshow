"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useOptimistic, useState, useTransition } from "react";
import type { Service } from "@/lib/tmdb";

/** Shown before "Show all": the country's most important ones (plus any you have). The rest are niche */
const TOP = 12;

/**
 * Logo tiles, tap to add or remove a service. Flips instantly, saves in the background, flips back if saving fails.
 * The country's top ones and yours first, every other one behind Show all.
 */
export function ServicePicker({
  choices,
  initial,
  save,
}: {
  choices: (Service & { logo: string })[];
  initial: number[];
  save: (id: number, on: boolean) => Promise<void>;
}) {
  const [saved, setSaved] = useState(() => new Set(initial));
  const [mine, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [all, setAll] = useState(false);
  // decided once, so a tile you untick doesn't jump away under your finger
  const [shown] = useState(() => new Set(choices.filter((s, i) => i < TOP || saved.has(s.id)).map((s) => s.id)));

  function flip(id: number) {
    const on = !mine.has(id);
    const next = new Set(mine);
    if (on) next.add(id);
    else next.delete(id);
    startTransition(async () => {
      setOptimistic(next);
      try {
        await save(id, on);
        // from the last saved set, not the optimistic one: another flip may still be pending or fail
        setSaved((prev) => {
          const done = new Set(prev);
          if (on) done.add(id);
          else done.delete(id);
          return done;
        });
      } catch {
        // optimistic state falls back to `saved` on its own
      }
    });
  }

  const more = choices.length - shown.size;
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {choices
          .filter((s) => all || shown.has(s.id))
          .map((s) => {
            const on = mine.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => flip(s.id)}
                  className={`flex w-full press items-center gap-3 rounded-thumb glass-cell p-3 text-left transition-colors duration-200 ${on ? "text-fg" : "text-muted hover:text-fg"}`}
                >
                  <Image
                    src={s.logo}
                    alt=""
                    width={40}
                    height={40}
                    className={`size-10 shrink-0 rounded-thumb transition-opacity duration-200 ${on ? "" : "opacity-40"}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-label font-medium">{s.name}</span>
                  <Check
                    size={18}
                    strokeWidth={2}
                    aria-hidden
                    className={`shrink-0 text-accent transition-opacity duration-200 ${on ? "pop" : "opacity-0"}`}
                  />
                </button>
              </li>
            );
          })}
      </ul>
      {!all && more > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="press self-start text-label text-muted hover:text-fg"
        >
          Show all {more} more
        </button>
      )}
    </div>
  );
}
