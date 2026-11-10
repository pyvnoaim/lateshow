import Link from "next/link";

export type Segment = { key: string; label: string; active: boolean } & (
  { href: string; onSelect?: never } | { onSelect: () => void; href?: never }
);

const item = "press flex h-9 items-center rounded-full px-4 text-small font-semibold transition-colors";
const on = "bg-fg text-bg";
const off = "text-muted hover:text-fg";

/** Pill switcher. Links when the choice lives in the URL (profile tabs), buttons when it's local state (season tabs). */
export function SegmentedTabs({ label, items }: { label: string; items: Segment[] }) {
  return (
    <nav aria-label={label} className="flex w-fit flex-wrap gap-1 rounded-full bg-raised p-1">
      {items.map((s) =>
        s.href !== undefined ? (
          <Link
            key={s.key}
            href={s.href}
            aria-current={s.active ? "page" : undefined}
            className={`${item} ${s.active ? on : off}`}
          >
            {s.label}
          </Link>
        ) : (
          <button
            key={s.key}
            type="button"
            aria-pressed={s.active}
            onClick={s.onSelect}
            className={`${item} ${s.active ? on : off}`}
          >
            {s.label}
          </button>
        ),
      )}
    </nav>
  );
}
