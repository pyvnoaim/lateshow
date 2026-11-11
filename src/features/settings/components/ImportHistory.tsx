"use client";

import { strFromU8, unzipSync } from "fflate";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useState, type DragEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { BatchResult, Candidate, Unsure } from "@/lib/library/importActions";
import { importBatch, importPick } from "@/lib/library/importActions";
import { readExport, type ImportRow } from "@/lib/library/importing";

const BATCH = 150;

type Totals = { watched: number; watchlist: number; notFound: number; skipped: number };

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

/**
 * Settings › Import: drop a Letterboxd export ZIP or IMDb CSVs. Rows go to the server in batches (progress shown),
 * clear matches are saved, unclear ones are listed to pick from.
 */
export function ImportHistory() {
  const [phase, setPhase] = useState<"idle" | "working" | "done">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [totals, setTotals] = useState<Totals>({ watched: 0, watchlist: 0, notFound: 0, skipped: 0 });
  const [unsure, setUnsure] = useState<Unsure[]>([]);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  async function start(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    let rows: ImportRow[];
    let skipped: number;
    try {
      ({ rows, skipped } = readExport(await readFiles(list)));
    } catch {
      setError("That file couldn't be opened. Try the export again.");
      return;
    }
    if (!rows.length) {
      setError("No films found. Pick the Letterboxd ZIP, or IMDb's ratings or watchlist CSV.");
      return;
    }
    setPhase("working");
    setProgress({ done: 0, total: rows.length });
    const sum: Totals = { watched: 0, watchlist: 0, notFound: 0, skipped };
    const open: Unsure[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      let r: BatchResult;
      try {
        r = await importBatch(rows.slice(i, i + BATCH));
      } catch {
        setError(`Stopped after ${i} of ${rows.length}. Drop the file again to continue, nothing is added twice.`);
        break;
      }
      sum.watched += r.watched;
      sum.watchlist += r.watchlist;
      sum.notFound += r.notFound;
      open.push(...r.unsure);
      setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length });
    }
    setTotals(sum);
    setUnsure(open);
    setPhase("done");
  }

  async function choose(item: Unsure, c: Candidate | null) {
    setUnsure((u) => u.filter((x) => x !== item));
    if (!c) return;
    const saved = await importPick(item.row, { id: c.id, title: c.title, posterPath: c.posterPath }).catch(() => null);
    if (saved)
      setTotals((t) => ({ ...t, watched: t.watched + saved.watched, watchlist: t.watchlist + saved.watchlist }));
  }

  if (phase === "working") {
    return (
      <p className="text-body text-muted" aria-live="polite">
        Matching your films <span className="text-fg nums">{progress.done}</span> of{" "}
        <span className="nums">{progress.total}</span>
      </p>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-body leading-normal text-muted" aria-live="polite">
          <span className="text-fg nums">{totals.watched}</span> watched and{" "}
          <span className="text-fg nums">{totals.watchlist}</span> on your watchlist came over.
          <br />
          {totals.notFound + totals.skipped > 0 && (
            <>
              <span className="nums">{totals.notFound + totals.skipped}</span> couldn&apos;t be found or placed.{" "}
            </>
          )}
          Ratings and reviews stay where they were.
        </p>
        {error && <p className="text-small text-danger">{error}</p>}
        {unsure.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-label font-semibold">
              <span className="nums">{unsure.length}</span> need a look. Same name, different film.
            </p>
            {unsure.slice(0, 20).map((u) => (
              <div
                key={`${u.row.title}-${u.row.year}`}
                className="flex flex-wrap items-center gap-3 rounded-banner glass-cell p-3"
              >
                <span className="min-w-0 flex-1 basis-40 pl-2">
                  <span className="block truncate text-label font-medium">{u.row.title}</span>
                  <span className="block text-caption text-muted">{u.row.year ?? "no year"} in your file</span>
                </span>
                {u.candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void choose(u, c)}
                    className="glass-hover flex press items-center gap-2.5 rounded-thumb p-1.5 pr-3 text-left"
                  >
                    <span className="relative aspect-poster w-8 shrink-0 overflow-hidden rounded-sm bg-raised">
                      {c.poster && <Image src={c.poster} alt="" fill sizes="32px" className="object-cover" />}
                    </span>
                    <span className="text-small">
                      {c.title}
                      <span className="block text-caption text-muted">{c.year ?? "Year unknown"}</span>
                    </span>
                  </button>
                ))}
                <button type="button" onClick={() => void choose(u, null)} className={buttonStyles("text", "text")}>
                  Skip
                </button>
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
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2 text-small leading-normal text-muted">
        <li>
          <span className="text-fg">Letterboxd</span>: Settings, Import &amp; Export, Export your data. Drop the ZIP as
          it comes.
        </li>
        <li>
          <span className="text-fg">IMDb</span>: on your ratings or watchlist, the ⋯ menu, Export. Drop the CSV.
        </li>
      </ul>
      <label
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-banner border border-dashed px-6 py-10 text-center transition-colors ${over ? "border-accent bg-accent/8" : "border-hairline hover:border-muted"}`}
      >
        <Upload size={22} strokeWidth={1.75} aria-hidden className="text-accent" />
        <span className="text-label font-semibold">Drop your export here</span>
        <span className="text-caption text-muted">or click to choose it</span>
        <input
          type="file"
          accept=".zip,.csv"
          multiple
          onChange={(e) => void start(e.target.files)}
          className="sr-only"
        />
      </label>
      <p className="text-caption text-muted">
        The file is read in your browser. Only the titles reach Lateshow. Importing twice adds nothing twice.
      </p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
