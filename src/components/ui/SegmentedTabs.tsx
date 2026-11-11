import Link from "next/link";

export type Segment = { key: string; label: string; active: boolean } & (
  { href: string; onSelect?: never } | { onSelect: () => void; href?: never }
);

// Plain text like the top bar links: active is white, the rest grey. Tall rows keep a 44px tap target.
const item = "flex h-11 items-center text-label transition-colors";
const on = "text-fg";
const off = "text-muted hover:text-fg";

/** Text switcher. Links when the choice lives in the URL (profile tabs), buttons when it's local state (season tabs). */
export function SegmentedTabs({
  label,
  items,
  swipe = false,
}: {
  label: string;
  items: Segment[];
  /** Long lists: one row you swipe sideways on phones, wrapping from tablet width up. */
  swipe?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      className={`flex gap-x-6 ${
        swipe
          ? "-mx-4 no-scrollbar overflow-x-auto px-4 whitespace-nowrap sm:mx-0 sm:w-fit sm:flex-wrap sm:overflow-visible sm:px-0"
          : "w-fit flex-wrap"
      }`}
    >
      {items.map((s) =>
        s.href !== undefined ? (
          <Link
            key={s.key}
            scroll={false}
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
