"use client";

import { ChevronDown } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { fieldStyles } from "@/components/ui/field";

/** Settings · Language: the native picker in a glass pill (a phone shows its own wheel). Saves on change. */
export function LanguagePicker({
  choices,
  current,
  save,
}: {
  choices: readonly { code: string; label: string }[];
  current: string;
  save: (code: string) => Promise<void>;
}) {
  const [shown, setShown] = useOptimistic(current);
  const [, startTransition] = useTransition();
  return (
    <div className={`relative w-fit ${fieldStyles()}`}>
      <select
        aria-label="Language"
        value={shown}
        onChange={(e) => {
          const code = e.target.value;
          startTransition(async () => {
            setShown(code);
            await save(code);
          });
        }}
        className="appearance-none bg-transparent pr-8 text-label text-fg outline-none"
      >
        {choices.map((l) => (
          <option key={l.code} value={l.code} className="bg-bg">
            {l.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={2} aria-hidden className="pointer-events-none absolute right-4" />
    </div>
  );
}
