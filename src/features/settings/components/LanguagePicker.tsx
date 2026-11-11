"use client";

import { useOptimistic, useTransition } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { LANGUAGES, type Language } from "@/lib/languages";

/** Plain text switcher. Switches at once, the page then reloads its titles in the new language. */
export function LanguagePicker({ current, save }: { current: Language; save: (code: string) => Promise<void> }) {
  const [shown, setShown] = useOptimistic(current);
  const [, startTransition] = useTransition();
  return (
    <SegmentedTabs
      label="Language"
      swipe
      items={LANGUAGES.map((l) => ({
        key: l.code,
        label: l.label,
        active: shown === l.code,
        onSelect: () =>
          startTransition(async () => {
            setShown(l.code);
            await save(l.code);
          }),
      }))}
    />
  );
}
