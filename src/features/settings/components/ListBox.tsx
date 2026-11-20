import type { ReactNode } from "react";

/** Settings' list of things you have (passkeys, browsers, imports): rows in one soft box, a hairline between them. */
export function ListBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="flex w-full flex-col divide-y divide-hairline rounded-group bg-fg/4 px-4">
      {children}
    </ul>
  );
}

/** One row: a small icon tile, a title with a line under it, its actions at the end. */
export function ListRow({
  icon,
  title,
  sub,
  accent = false,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** the tile in the accent (this browser, a passkey), else quiet */
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3.5 py-4">
      <span
        aria-hidden
        className={`flex size-8 shrink-0 items-center justify-center rounded-poster ${accent ? "bg-accent/14 text-accent" : "bg-fg/6 text-fg/80"}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label font-medium">{title}</span>
        {sub && <span className="text-caption text-pretty text-muted">{sub}</span>}
      </span>
      {children}
    </li>
  );
}

/** A clear invitation in place of an empty list or a missing step: icon, what and why, one action. */
export function Invite({
  icon,
  title,
  text,
  glow = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  glow?: boolean;
  /** the action, none when there's nothing to do here */
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex w-full flex-wrap items-center gap-4 overflow-hidden rounded-group p-5 ${glow ? "bg-accent/8 ring-1 ring-accent/18" : "bg-fg/4"}`}
    >
      <span aria-hidden className="relative flex size-12 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="relative flex min-w-48 flex-1 flex-col gap-1">
        <span className="text-body font-semibold text-balance">{title}</span>
        <span className="text-small text-pretty text-muted">{text}</span>
      </span>
      {children && <span className="relative shrink-0">{children}</span>}
    </div>
  );
}
