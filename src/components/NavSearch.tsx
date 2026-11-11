"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { fieldInputStyles } from "./ui/field";

/**
 * Search icon in the top bar that grows into a field. "/" anywhere opens it, Esc or leaving it empty closes it.
 * Results update while you type (250 ms after the last key, 2+ letters). On /search it stays open with the query.
 */
const DEBOUNCE_MS = 250;
const MIN_LETTERS = 2;

export function NavSearch() {
  const onSearchPage = usePathname() === "/search";
  const query = useSearchParams().get("q") ?? "";
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  // The page you were on before live search opened the results, so emptying the field can take you back.
  const origin = useRef<string | null>(null);
  const [value, setValue] = useState(onSearchPage ? query : "");
  const [open, setOpen] = useState(onSearchPage);
  const [typing, setTyping] = useState(false);
  const expanded = open || onSearchPage;

  // Follow the URL (back button, leaving the results page), reset during render instead of in an effect.
  // While you're typing the URL trails your input, so it must not overwrite what you just typed.
  const urlKey = onSearchPage ? `search:${query}` : "elsewhere";
  const [seenUrl, setSeenUrl] = useState(urlKey);
  if (seenUrl !== urlKey) {
    setSeenUrl(urlKey);
    if (!onSearchPage) {
      // left the results page (Back, a link): start fresh, or the live search would reopen it
      setTyping(false);
      setValue("");
      setOpen(false);
    } else if (!typing) {
      setValue(query);
      setOpen(true);
    }
  }

  /** The results URL for a query. On /search it keeps the type and genre filters. */
  function searchUrl(q: string) {
    const params = new URLSearchParams(window.location.pathname === "/search" ? window.location.search : "");
    if (q) params.set("q", q);
    else params.delete("q");
    const query = params.toString();
    return query ? `/search?${query}` : "/search";
  }

  /** Back to the page before the search (or Home if you opened /search directly). */
  const leaveSearch = useCallback(() => {
    setTyping(false);
    input.current?.blur(); // a closed field must not keep the cursor
    if (origin.current) {
      origin.current = null;
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  // Live results: replace the URL on the results page, open it once from anywhere else.
  useEffect(() => {
    if (!typing) return;
    const q = value.trim();
    if (onSearchPage && q === query) return;
    if (q.length > 0 && q.length < MIN_LETTERS) return;
    if (!q && !onSearchPage) return;
    const timer = setTimeout(() => {
      const url = searchUrl(q);
      // Emptied the field while browsing a genre: stay and browse, otherwise go back to where you were.
      if (!q && url === "/search") return leaveSearch();
      // Check the real URL now: a push from a moment ago may not have reached `onSearchPage` yet.
      // One history entry per search session, so Back returns to where you came from.
      if (window.location.pathname === "/search") {
        router.replace(url, { scroll: false });
      } else {
        origin.current = window.location.pathname;
        router.push(url);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, typing, onSearchPage, query, router, leaveSearch]);

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

  // Clicking outside: an empty search closes (and leaves the results page). With a query the results stay,
  // because clicking a result also blurs the field first.
  function close() {
    setTyping(false);
    if (value.trim() !== "") return;
    if (!onSearchPage) setOpen(false);
    else if (searchUrl("") === "/search") leaveSearch(); // browsing a genre with filters: stay
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(searchUrl(q));
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      // fixed widths both ways (36 to 288 px) so the width animates smoothly, and the glass fades in on its own layer
      className={`relative flex h-9 max-w-full min-w-0 items-center overflow-hidden rounded-full text-small text-muted transition-all duration-500 ease-spring focus-within:ring-1 focus-within:ring-fg/30 focus-within:ring-inset ${
        expanded ? "w-72 gap-1 pr-3.5" : "w-9 shrink-0"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-full glass transition-opacity duration-300 ${expanded ? "opacity-100" : "opacity-0"}`}
      />
      <button
        type={expanded ? "submit" : "button"}
        aria-label={expanded ? "Search" : "Open search"}
        data-tip={expanded ? undefined : "Search"}
        data-tip-key={expanded ? undefined : "/"}
        onClick={() => {
          if (expanded) return;
          setOpen(true);
          input.current?.focus();
        }}
        className="relative flex size-9 shrink-0 press items-center justify-center rounded-full text-fg"
      >
        <Search size={18} strokeWidth={1.75} aria-hidden />
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
        onChange={(e) => {
          setTyping(true);
          setValue(e.target.value);
        }}
        onBlur={close}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          setValue("");
          if (onSearchPage) leaveSearch();
          else setOpen(false);
          e.currentTarget.blur();
        }}
        className={`relative ${fieldInputStyles} transition-opacity duration-300 ${expanded ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
    </form>
  );
}
