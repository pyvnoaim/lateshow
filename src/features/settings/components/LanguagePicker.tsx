"use client";

import { useOptimistic, useTransition } from "react";
import { Select } from "@/components/ui/Select";

/** Settings · Language: switches at once, saves in the background, the page then reloads its data. */
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
    <Select
      label="Language"
      value={shown}
      options={choices.map((l) => ({ value: l.code, label: l.label }))}
      onChange={(code) =>
        startTransition(async () => {
          setShown(code);
          await save(code);
        })
      }
    />
  );
}
