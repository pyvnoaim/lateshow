"use client";

import { strFromU8, unzipSync } from "fflate";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { BatchResult, Candidate, Saved, Unsure } from "@/lib/library/importActions";
import { importBatch, importPick, startImport } from "@/lib/library/importActions";
import { readExport, type ImportRow, type ImportSource } from "@/lib/library/importing";
import { CountUp, ImportProgress } from "./ImportProgress";

// ponytail: one size for all. A Netflix series row fetches every season, so batches stay small.
const BATCH = 40;
// the server takes at most 6000 episodes per call (Netflix), a batch also ends here
const EPISODES = 3000;

type Totals = Saved & { notFound: number; skipped: number };
const EMPTY: Saved = { watched: 0, films: 0, series: 0, episodes: 0, watchlist: 0, missed: 0 };
const add = (a: Totals, b: Saved): Totals => ({
  ...a,
  watched: a.watched + b.watched,
  films: a.films + b.films,
  series: a.series + b.series,
  episodes: a.episodes + b.episodes,
  watchlist: a.watchlist + b.watchlist,
  missed: a.missed + b.missed,
});

/** The files you picked or dropped, as text. A ZIP (Letterboxd) is unpacked right here, nothing is uploaded. */
async function readFiles(list: FileList) {
  const out: { name: string; text: string }[] = [];
  for (const file of Array.from(list)) {
    if (/\.zip$/i.test(file.name)) {
      const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => /\.csv$/i.test(f.name) });
      for (const [name, bytes] of Object.entries(files)) out.push({ name, text: strFromU8(bytes) });
    } else out.push({ name: file.name, text: await file.text() });
  }
  return out;
}

/** What the file says about an unclear title: its episodes, its year, or (Netflix films) when you watched it. */
function fileNote(row: ImportRow) {
  if (row.episodes) return `${row.episodes.length} episode${row.episodes.length === 1 ? "" : "s"} in your file`;
  if (row.year) return `${row.year} in your file`;
  if (row.date)
    return `Watched ${new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en", { month: "short", year: "numeric" })}`;
  return "No year in your file";
}

/**
 * Settings › Import: drop a Letterboxd export ZIP, IMDb CSVs or Netflix's viewing history. Rows go to the server in batches (progress shown),
 * clear matches are saved, unclear ones are listed to pick from.
 */
export function ImportHistory() {
  const [phase, setPhase] = useState<"idle" | "working" | "done">("idle");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, until: 0 });
  const [totals, setTotals] = useState<Totals>({ ...EMPTY, notFound: 0, skipped: 0 });
  const [unsure, setUnsure] = useState<Unsure[]>([]);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [incoming, setIncoming] = useState(false);

  const running = useRef(false);
  const batch = useRef(""); // this run's import id, picks join it

  async function start(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    let rows: ImportRow[];
    let skipped: number;
    let source: ImportSource;
    try {
      ({ rows, skipped, source } = readExport(await readFiles(list)));
    } catch {
      setError("That file couldn't be opened. Try the export again.");
      return;
    }
    await run(rows, skipped, source);
  }

  async function run(rows: ImportRow[], skipped: number, source: ImportSource) {
    if (running.current) return; // one import at a time (the extension may post twice)
    setError("");
    if (!rows.length) {
      setError(
        "No titles found. Pick the Letterboxd ZIP, IMDb's ratings or watchlist CSV, Netflix's viewing history or the Prime Video export.",
      );
      return;
    }
    // oldest first, so the import screen's title, month and bars move together (undated rows last)
    rows.sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"));
    running.current = true;
    // one id for the run, on everything it adds: Settings can remove it as a whole
    let importId: string;
    try {
      importId = await startImport(source);
    } catch {
      setError("The import couldn't start. Try again.");
      running.current = false;
      return;
    }
    batch.current = importId;
    setRows(rows);
    setPhase("working");
    setProgress({ done: 0, until: 0 });
    let sum: Totals = { ...EMPTY, notFound: 0, skipped };
    const open: Unsure[] = [];
    for (let i = 0; i < rows.length;) {
      let end = i;
      for (let eps = 0; end < rows.length && end - i < BATCH; end++) {
        eps += rows[end].episodes?.length ?? 0;
        if (eps > EPISODES && end > i) break;
      }
      setProgress({ done: i, until: end });
      let r: BatchResult;
      try {
        r = await importBatch(rows.slice(i, end), importId);
      } catch {
        setError(`Stopped after ${i} of ${rows.length}. Start it again to continue, nothing is added twice.`);
        break;
      }
      sum = add(sum, r);
      sum.notFound += r.notFound;
      open.push(...r.unsure);
      i = end;
    }
    setTotals(sum);
    setUnsure(open);
    setPhase("done");
    running.current = false;
  }

  // The Lateshow extension hands over a site's history (read there, signed in there) through its content script on
  // this page: the page says it's ready, the script posts the rows once. Only this window's own messages count.
  // Rows are checked again on the server like a file's.
  useEffect(() => {
    const take = (e: MessageEvent) => {
      const d = e.data as {
        type?: string;
        rows?: unknown;
        skipped?: unknown;
        count?: unknown;
        source?: unknown;
      } | null;
      // this window only. Not checked: the origin, Firefox stamps an extension script's messages with its own
      if (e.source !== window) return;
      // the script may start after this page said ready: it says hello, the page answers (and shows it's coming)
      if (d?.type === "lateshow:import-hello") {
        if (d.count === 0) {
          setError("The extension has nothing waiting. Read your history on the streaming site again.");
          return;
        }
        setIncoming(true);
        window.postMessage({ type: "lateshow:import-ready" }, location.origin);
      }
      if (d?.type !== "lateshow:import-rows") return;
      if (!Array.isArray(d.rows) || d.rows.length > 20000) return;
      // the extension forgets them only now, so a handoff that fails can be tried again
      window.postMessage({ type: "lateshow:import-received" }, location.origin);
      // the extension says where it read them
      const source = d.source === "Crunchyroll" || d.source === "Netflix" ? d.source : "Prime Video";
      void run(d.rows as ImportRow[], typeof d.skipped === "number" ? d.skipped : 0, source);
    };
    window.addEventListener("message", take);
    window.postMessage({ type: "lateshow:import-ready" }, location.origin);
    return () => window.removeEventListener("message", take);
  }, []);

  async function choose(item: Unsure, c: Candidate | null) {
    setUnsure((u) => u.filter((x) => x !== item));
    if (!c) return;
    const saved = await importPick(
      item.row,
      { id: c.id, type: c.type, title: c.title, posterPath: c.posterPath },
      batch.current,
    ).catch(() => null);
    if (saved) setTotals((t) => add(t, saved));
  }

  if (phase === "working") return <ImportProgress rows={rows} done={progress.done} until={progress.until} />;

  if (phase === "done") {
    const stats = [
      // a fixed key: the label turns plural ("film" to "films") and a new key would restart the count from 0
      { key: "episodes", n: totals.episodes, label: totals.episodes === 1 ? "episode" : "episodes" },
      { key: "series", n: totals.series, label: "series" },
      { key: "films", n: totals.films, label: totals.films === 1 ? "film" : "films" },
      { key: "watchlist", n: totals.watchlist, label: "on your watchlist" },
    ].filter((s) => s.n > 0);
    const lost = totals.notFound + totals.skipped;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5" aria-live="polite">
          <p className="text-body font-semibold text-balance">
            {stats.length ? "Your history is in" : "Nothing new, it was all here already"}
          </p>
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {stats.map((s, i) => (
                <div key={s.key} className="flex rise flex-col" style={{ animationDelay: `${i * 150}ms` }}>
                  <span className="text-section leading-none font-semibold tracking-tight nums">
                    <CountUp to={s.n} delay={i * 150} />
                  </span>
                  <span className="text-small text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          )}
          {(lost > 0 || totals.missed > 0) && (
            <p
              className="rise text-small text-pretty text-muted"
              style={{ animationDelay: `${stats.length * 150 + 300}ms` }}
            >
              {lost > 0 && (
                <>
                  <span className="nums">{lost}</span> couldn&apos;t be found or placed.{" "}
                </>
              )}
              {totals.missed > 0 && (
                <>
                  <span className="nums">{totals.missed}</span> episodes had names TMDB doesn&apos;t know.
                </>
              )}
            </p>
          )}
        </div>
        {error && <p className="text-small text-danger">{error}</p>}
        {unsure.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-label font-semibold">
              <span className="nums">{unsure.length}</span> need a look. Same name, different title.
            </p>
            {unsure.slice(0, 20).map((u) => (
              <div key={`${u.row.title}-${u.row.year}`} className="flex flex-col gap-2 rounded-banner glass-cell p-3">
                <div className="flex items-start justify-between gap-3 pt-1 pl-2">
                  <span className="min-w-0">
                    <span className="block text-label font-medium text-balance">{u.row.title}</span>
                    <span className="block text-caption text-muted">{fileNote(u.row)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void choose(u, null)}
                    className={`${buttonStyles("text", "text")} shrink-0`}
                  >
                    Skip
                  </button>
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {u.candidates.map((c) => (
                    <button
                      key={`${c.type}-${c.id}`}
                      type="button"
                      onClick={() => void choose(u, c)}
                      className="glass-hover flex press items-center gap-2.5 rounded-thumb p-1.5 pr-3 text-left"
                    >
                      <span className="relative aspect-poster w-8 shrink-0 overflow-hidden rounded-sm bg-raised">
                        {c.poster && <Image src={c.poster} alt="" fill sizes="32px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 text-small">
                        {c.title}
                        <span className="block text-caption text-muted">
                          {c.type === "tv" ? "Series · " : ""}
                          {c.year ?? "Year unknown"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setPhase("idle")} className={`${buttonStyles("text", "text")} w-fit`}>
          Import another file
        </button>
      </div>
    );
  }

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void start(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={drop}
      className="flex flex-col items-start gap-4"
    >
      <label className={`${buttonStyles("glass", "sm")} cursor-pointer ${over ? "ring-1 ring-accent" : ""}`}>
        <Upload size={16} strokeWidth={2} aria-hidden />
        {over ? "Drop it" : "Choose your export"}
        <input
          type="file"
          accept=".zip,.csv"
          multiple
          onChange={(e) => void start(e.target.files)}
          className="sr-only"
        />
      </label>
      {incoming && !error && <p className="text-small text-muted">Getting your history from the extension…</p>}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
