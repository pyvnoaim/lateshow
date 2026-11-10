"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { fieldInputStyles, fieldStyles } from "./ui/field";

/**
 * Search icon in the top bar that grows into a field. "/" anywhere opens it, Esc or leaving it empty closes it.
 * On /search it stays open with the current query.
 */
export function NavSearch() {
  const onSearchPage = usePathname() === "/search";
  const query = useSearchParams().get("q") ?? "";
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(onSearchPage ? query : "");
  const [open, setOpen] = useState(onSearchPage);
  const expanded = open || onSearchPage;

  // Follow the URL when you search again or leave the results page (reset during render, no effect needed).
  const urlKey = onSearchPage ? `search:${query}` : "elsewhere";
  const [seenUrl, setSeenUrl] = useState(urlKey);
  if (seenUrl !== urlKey) {
    setSeenUrl(urlKey);
    setValue(onSearchPage ? query : "");
    setOpen(onSearchPage);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      setOpen(true);
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    if (!onSearchPage && value.trim() === "") setOpen(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`flex items-center overflow-hidden rounded-full transition-all duration-300 ease-spring ${
        expanded ? `${fieldStyles("bar")} w-64 sm:w-96` : "h-11 w-11"
      }`}
    >
      <button
        type={expanded ? "submit" : "button"}
        aria-label={expanded ? "Search" : "Open search"}
        onClick={() => {
          if (expanded) return;
          setOpen(true);
          input.current?.focus();
        }}
        className="flex size-11 shrink-0 press items-center justify-center rounded-full text-fg"
      >
        <Search size={20} strokeWidth={1.75} aria-hidden />
      </button>
      <label htmlFor="nav-search" className="sr-only">
        Search movies, series and people
      </label>
      <input
        ref={input}
        id="nav-search"
        type="search"
        autoComplete="off"
        placeholder="Find a movie, series or person"
        value={value}
        tabIndex={expanded ? 0 : -1}
        autoFocus={onSearchPage && query === ""}
        onChange={(e) => setValue(e.target.value)}
        onBlur={close}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          setValue(onSearchPage ? value : "");
          e.currentTarget.blur();
          if (!onSearchPage) setOpen(false);
        }}
        className={`${fieldInputStyles} transition-opacity duration-200 ${expanded ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
    </form>
  );
}
