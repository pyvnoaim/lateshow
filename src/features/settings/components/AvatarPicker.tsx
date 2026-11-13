"use client";

import { useOptimistic, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { TONES } from "@/lib/avatar";

/** Settings · Picture: your initial in every tone, tap the one you want. The picked one gets a ring. */
export function AvatarPicker({
  name,
  current,
  save,
}: {
  name: string;
  current: string | null;
  save: (value: string) => Promise<void>;
}) {
  const [shown, setShown] = useOptimistic(current ?? "");
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-4">
      {TONES.map((t) => {
        const v = t === "icy" ? "" : `c:${t}`;
        const on = shown === v;
        const label = t.charAt(0).toUpperCase() + t.slice(1);
        return (
          <button
            key={t}
            type="button"
            aria-label={label}
            aria-pressed={on}
            data-tip={label}
            onClick={() =>
              startTransition(async () => {
                setShown(v);
                await save(v);
              })
            }
            className={`press rounded-full transition-opacity duration-200 ${on ? "ring-2 ring-fg/80 ring-offset-3 ring-offset-bg" : "opacity-50 hover:opacity-100"}`}
          >
            <Avatar name={name} image={v} size="md" />
          </button>
        );
      })}
    </div>
  );
}
