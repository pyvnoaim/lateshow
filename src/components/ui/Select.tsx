"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { fieldStyles } from "@/components/ui/field";

/**
 * Every dropdown: a glass pill that opens a small glass menu under it, the picked one with an icy check.
 * Radix does the keyboard (arrows, typing a letter, Enter, Esc), focus and screen reader parts.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <RadixSelect.Trigger aria-label={label} className={`${fieldStyles()} w-fit press pr-4 text-label outline-none`}>
        <span className="text-fg">
          <RadixSelect.Value />
        </span>
        <RadixSelect.Icon className="text-muted">
          <ChevronDown size={16} strokeWidth={2} aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={8}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-48 pop overflow-hidden rounded-thumb p-1.5 glass-deep"
        >
          <RadixSelect.Viewport>
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className={`flex h-11 cursor-default items-center justify-between gap-6 rounded-thumb px-3.5 text-label outline-none select-none data-highlighted:bg-fg/10 data-highlighted:text-fg ${o.value === value ? "text-fg" : "text-muted"}`}
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={16} strokeWidth={2} aria-hidden className="text-accent" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
