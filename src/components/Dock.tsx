"use client";

import { Bookmark, House, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ponytail: Watchlist, Rooms and You point at pages that come with later layers (library, rooms, accounts).
const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/rooms", label: "Rooms", icon: Users },
] as const;

/** Floating glass dock, bottom center, on every page. */
export function Dock() {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav aria-label="Main" className="glass fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-3xl p-1.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_20px_40px_rgb(0_0_0/0.5)]">
      {items.map(({ href, label, icon: Icon }) => (
        <DockItem key={href} href={href} label={label} active={on(href)}>
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </DockItem>
      ))}
      <DockItem href="/u/me" label="You" active={on("/u/")}>
        <span className="flex size-[22px] items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-bg">A</span>
      </DockItem>
    </nav>
  );
}

function DockItem({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-[52px] w-[72px] flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.92] ${
        active ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {children}
      {label}
    </Link>
  );
}
