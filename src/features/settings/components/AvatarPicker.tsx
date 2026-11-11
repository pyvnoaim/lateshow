"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Avatar, TONE_CLASS } from "@/components/Avatar";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { photoUrl, TONES } from "@/lib/avatar";

type Face = { id: number; name: string; path: string; title: string };

const chosen = "ring-2 ring-fg/80 ring-offset-3 ring-offset-bg";

/**
 * Settings · Profile picture. A big preview, then Color (your initial on a glass tone) or Cast (a face from what
 * you watched, or anyone you search for).
 */
export function AvatarPicker({
  name,
  current,
  faces,
  save,
  find,
}: {
  name: string;
  current: string | null;
  faces: Face[];
  save: (value: string) => Promise<void>;
  find: (query: string) => Promise<Face[]>;
}) {
  const [shown, setShown] = useOptimistic(current ?? "");
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"color" | "cast">(current?.startsWith("p:") ? "cast" : "color");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Face[] | null>(null);
  const [searching, startSearch] = useTransition();

  // a short pause after typing, so each letter isn't a TMDB search
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => startSearch(async () => setFound(await find(query))), 250);
    return () => clearTimeout(t);
  }, [query, find]);

  const pick = (v: string) =>
    startTransition(async () => {
      setShown(v);
      await save(v);
    });
  const list = query.trim().length >= 2 ? (found ?? []) : faces;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6">
        <Avatar name={name} image={shown} size="xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-body font-semibold">{name}</span>
          <span className="text-small text-muted">Everyone sees this next to your name.</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SegmentedTabs
          label="Kind of picture"
          items={[
            { key: "color", label: "Color", active: tab === "color", onSelect: () => setTab("color") },
            { key: "cast", label: "Cast", active: tab === "cast", onSelect: () => setTab("cast") },
          ]}
        />

        {tab === "color" ? (
          <div className="flex flex-wrap gap-4">
            {TONES.map((t) => {
              const v = t === "icy" ? "" : `c:${t}`;
              const on = shown === v;
              return (
                <button
                  key={t}
                  type="button"
                  aria-label={t}
                  aria-pressed={on}
                  data-tip={t.charAt(0).toUpperCase() + t.slice(1)}
                  onClick={() => pick(v)}
                  className={`size-10 press rounded-full glass-accent ${TONE_CLASS[t]} ${on ? chosen : ""}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <label className={`${fieldStyles("md")} max-w-form`}>
              <Search size={18} strokeWidth={1.75} aria-hidden />
              <span className="sr-only">Search an actor</span>
              <input
                type="text"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search an actor"
                className={fieldInputStyles}
              />
            </label>
            <span className="text-caption text-muted">
              {query.trim().length >= 2
                ? searching
                  ? "Searching"
                  : list.length === 0
                    ? "Nobody with a photo by that name."
                    : "Tap a face to use it."
                : faces.length > 0
                  ? "From what you watched lately."
                  : "Search anyone. Titles you mark as watched add their cast here too."}
            </span>
            {list.length > 0 && (
              <ul className="flex flex-wrap gap-x-5 gap-y-6">
                {list.map((f) => {
                  const v = `p:${f.path}`;
                  const on = shown === v;
                  return (
                    <li key={f.id} className="w-16">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={f.title ? `${f.name}, ${f.title}` : f.name}
                        data-tip={f.name}
                        data-tip-meta={f.title || undefined}
                        onClick={() => pick(v)}
                        className="group flex w-full flex-col items-center gap-2 text-center"
                      >
                        <span
                          className={`relative size-14 press overflow-hidden rounded-full glass-cell transition-transform duration-200 group-hover:scale-105 ${on ? chosen : ""}`}
                        >
                          <Image src={photoUrl(f.path)} alt="" fill sizes="56px" className="object-cover" />
                        </span>
                        <span
                          className={`line-clamp-2 w-full text-caption leading-snug ${on ? "text-fg" : "text-muted"}`}
                        >
                          {f.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
