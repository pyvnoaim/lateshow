"use client";

import { ChevronDown, FileUp, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { ago } from "@/lib/ago";
import { ListBox } from "./ListBox";
import { useExtension } from "./useExtension";

/** `posters`: small poster urls of what it brought (a few), `titles`: how many films and series in all */
export type PastImport = {
  id: string;
  source: string;
  when: string;
  watches: number;
  listed: number;
  titles: number;
  posters: string[];
};

// the extension syncs these by itself (Sync), the others come from a file
const SYNCED = ["Netflix", "Prime Video", "Crunchyroll"];
type SyncState = {
  site: string;
  phase: string;
  read?: number;
  done?: number;
  total?: number;
  message?: string;
  queued?: string[];
  at: number;
};

const n = (x: number) => x.toLocaleString("en");
const plural = (x: number, one: string, many = `${one}s`) => `${n(x)} ${x === 1 ? one : many}`;
const what = (i: PastImport) =>
  [i.watches && plural(i.watches, "watch", "watches"), i.listed && `${n(i.listed)} on your watchlist`]
    .filter(Boolean)
    .join(" · ");

/**
 * Settings › Import, what came in: one line per service (its total, when it last came in, Sync for the ones the
 * extension reads), opening into a timeline of its imports with what each brought and Remove (asks first, it takes
 * back only what that import added, see removeImport).
 */
export function PastImports({
  imports,
  logos,
  last,
  remove,
}: {
  imports: PastImport[];
  /** the services' own logos (TMDB's, through next/image), by source name */
  logos: Record<string, string>;
  /** when each source last came in (ISO), a sync that brought nothing new too */
  last: Record<string, string>;
  remove: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const ext = useExtension();
  const sync = useSync();
  const shown = imports.filter((i) => !gone.includes(i.id));

  // newest first already: one group per source, in the order they last came in
  const groups = [...new Set(shown.map((i) => i.source))].map((source) => ({
    source,
    runs: shown.filter((i) => i.source === source),
  }));
  if (!groups.length) return null;
  const canSync = Boolean(ext?.version && ext.keyId);

  return (
    <ListBox label="What you imported">
      {groups.map(({ source, runs }) => {
        const watches = runs.reduce((s, r) => s + r.watches, 0);
        const listed = runs.reduce((s, r) => s + r.listed, 0);
        const site = SYNCED.includes(source);
        const logo = logos[source];
        const running = sync.state?.site === source && ["reading", "importing"].includes(sync.state.phase);
        // a sync from here that failed says why (signed out on the site, another profile, Lateshow not reached)
        const failed = sync.state?.site === source && sync.state.phase === "error" ? sync.state.message : null;
        const sub = running
          ? sync.state!.phase === "reading"
            ? `Syncing · read ${plural(sync.state!.read ?? 0, "title")}`
            : `Syncing · matching ${n(sync.state!.done ?? 0)} of ${n(sync.state!.total ?? 0)}`
          : [watches && plural(watches, "watch", "watches"), listed && `${n(listed)} on your watchlist`]
              .filter(Boolean)
              .concat(
                last[source]
                  ? `${site ? "synced" : "imported"} ${ago(new Date(last[source]), new Date())}`
                  : `last ${runs[0].when}`,
              )
              .join(" · ");
        // while another syncs, a click puts this one in line (the extension runs them one after another)
        const queued = sync.busy && Boolean(sync.state?.queued?.includes(source));
        const isOpen = open === source;
        return (
          <li key={source} className="flex flex-col">
            <div className="flex items-center gap-3.5 py-4">
              {logo ? (
                <span aria-hidden className="relative size-8 shrink-0 overflow-hidden rounded-poster">
                  <Image src={logo} alt="" fill sizes="32px" className="object-cover" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-poster bg-fg/6 text-fg/80"
                >
                  <FileUp size={15} strokeWidth={2} />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label font-medium">{source}</span>
                {/* the time is the browser's ("2 hours ago"), a minute apart from the server's render */}
                <span suppressHydrationWarning className="text-caption text-muted nums">
                  {sub}
                </span>
                {failed && <span className="text-caption text-pretty text-danger">{failed}</span>}
              </span>
              {site && canSync && (
                <button
                  type="button"
                  disabled={running || queued}
                  onClick={() => sync.start(source)}
                  className={buttonStyles("glass", "xs")}
                >
                  <RefreshCw size={13} strokeWidth={2.2} aria-hidden />
                  {running ? "Syncing" : queued ? "Queued" : "Sync"}
                </button>
              )}
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`${source} imports`}
                data-tip={isOpen ? "Hide imports" : "Show imports"}
                onClick={() => setOpen(isOpen ? null : source)}
                className="flex size-8 press items-center justify-center rounded-full text-muted hover:text-fg"
              >
                <ChevronDown
                  size={16}
                  strokeWidth={2.2}
                  aria-hidden
                  className={`duration-hover transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {isOpen && (
              <ol className="relative mb-4 ml-4 flex flex-col gap-6 border-l-2 border-hairline pl-6">
                {runs.map((r, i) => (
                  <li key={r.id} className="relative flex flex-col gap-2.5">
                    <span
                      aria-hidden
                      className={`absolute top-1.5 -left-7.75 size-3 rounded-full ${i === 0 ? "bg-accent ring-4 ring-accent/18" : "bg-fg/25"}`}
                    />
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-label font-medium">{r.when}</span>
                      <span className="text-caption text-muted nums">
                        {what(r)}
                        {r.titles > 0 && ` in ${plural(r.titles, "title")}`}
                      </span>
                      {asking !== r.id && (
                        <button
                          type="button"
                          onClick={() => setAsking(r.id)}
                          className={buttonStyles("text", "text", "ml-auto text-small hover:text-danger")}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {r.posters.length > 0 && (
                      <div className="flex items-center gap-2">
                        {r.posters.map((p) => (
                          <span key={p} className="relative aspect-poster w-11 overflow-hidden rounded-sm bg-raised">
                            <Image src={p} alt="" fill sizes="44px" className="object-cover" />
                          </span>
                        ))}
                        {r.titles > r.posters.length && (
                          <span className="text-caption text-muted nums">+{n(r.titles - r.posters.length)}</span>
                        )}
                      </div>
                    )}
                    {asking === r.id && (
                      <div className="flex flex-wrap items-center gap-3 rounded-thumb bg-danger/8 p-3 ring-1 ring-danger/20">
                        <span className="min-w-48 flex-1 text-small text-pretty">
                          Take back {what(r)}? What you marked yourself and your own ratings stay.
                        </span>
                        <button type="button" onClick={() => setAsking(null)} className={buttonStyles("text", "text")}>
                          Keep
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await remove(r.id);
                              setGone((g) => [...g, r.id]);
                              setAsking(null);
                            })
                          }
                          className={buttonStyles("dangerConfirm", "sm")}
                        >
                          {pending ? "Removing" : "Remove"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ListBox>
  );
}

/**
 * Sync through the extension from this page: the page asks the extension's script here (lateshow.ts), which hands
 * it to the extension and reports its progress back. When a sync ends the page refreshes with what came in.
 */
function useSync() {
  const router = useRouter();
  const [state, setState] = useState<SyncState | null>(null);
  useEffect(() => {
    const take = (e: MessageEvent) => {
      const d = e.data as { type?: string; state?: SyncState } | null;
      if (e.source !== window || d?.type !== "lateshow:sync-state" || !d.state) return;
      // an old failure (yesterday's) isn't news on this page
      if (d.state.phase === "error" && Date.now() - d.state.at > 10 * 60_000) return;
      setState((prev) => {
        // a sync that just ended: show what came in
        if (prev && ["reading", "importing"].includes(prev.phase) && d.state!.phase === "done") router.refresh();
        return d.state!;
      });
    };
    window.addEventListener("message", take);
    return () => window.removeEventListener("message", take);
  }, [router]);
  // a crashed sync ends after 5 minutes in the extension (background.ts), which reports that too
  const busy = Boolean(state && ["reading", "importing"].includes(state.phase));
  return {
    state,
    busy,
    start: (site: string) => window.postMessage({ type: "lateshow:sync-start", site }, location.origin),
  };
}
