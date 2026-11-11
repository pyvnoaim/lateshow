"use client";

import { useOptimistic, useTransition } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

/** Plain text switcher for one setting. Switches at once, saves in the background, the page then reloads its data. */
export function ChoicePicker<T extends string>({
  label,
  choices,
  current,
  save,
}: {
  label: string;
  choices: readonly { value: T; label: string }[];
  current: T;
  save: (value: T) => Promise<void>;
}) {
  const [shown, setShown] = useOptimistic(current);
  const [, startTransition] = useTransition();
  return (
    <SegmentedTabs
      label={label}
      swipe
      items={choices.map((c) => ({
        key: c.value,
        label: c.label,
        active: shown === c.value,
        onSelect: () =>
          startTransition(async () => {
            setShown(c.value);
            await save(c.value);
          }),
      }))}
    />
  );
}
