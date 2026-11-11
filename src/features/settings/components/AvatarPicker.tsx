"use client";

import { useOptimistic, useTransition } from "react";
import { Avatar, TONE_CLASS } from "@/components/Avatar";
import { TONES } from "@/lib/avatar";

/** Settings · Profile picture: a big preview and plain color dots. Your initial on glass in that tone. */
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
  const pick = (v: string) =>
    startTransition(async () => {
      setShown(v);
      await save(v);
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6">
        <Avatar name={name} image={shown} size="xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-body font-semibold">{name}</span>
          <span className="text-small text-muted">Everyone sees this next to your name.</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {TONES.map((t) => {
          const v = t === "icy" ? "" : `c:${t}`;
          const on = shown === v;
          return (
            <button
              key={t}
              type="button"
              aria-label={t}
              aria-pressed={on}
              data-tip={t.charAt(0).toUpperCase() + t.slice(1)}
              onClick={() => pick(v)}
              className={`size-10 press rounded-full glass-accent ${TONE_CLASS[t]} ${on ? "ring-2 ring-fg/80 ring-offset-3 ring-offset-bg" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
