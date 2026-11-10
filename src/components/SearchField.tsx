"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

/** Wide glass search in the top bar. "/" anywhere focuses it. Submits to /search?q= */
export function SearchField({ defaultValue = "" }: { defaultValue?: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form action="/search" role="search" className="glass flex h-12 items-center gap-3 rounded-full pr-2 pl-[18px] text-muted focus-within:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)]">
      <Search size={18} strokeWidth={1.75} aria-hidden />
      <label htmlFor="q" className="sr-only">Search</label>
      <input
        ref={ref}
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Find a movie, series or person"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
      />
      <kbd className="rounded-md bg-fg/8 px-2 py-0.5 text-xs font-medium text-muted">/</kbd>
    </form>
  );
}
