/**
 * Import from Letterboxd (export ZIP) and IMDb (ratings / watchlist CSV). Pure, runs in the browser (reading the
 * files) and on the server (matching to TMDB). Only these rows ever leave the browser, never the file.
 */

export type ImportRow = {
  title: string;
  year?: number;
  /** IMDb's id (tt1234567): matches exactly. Letterboxd has none, so it matches by title and year. */
  imdbId?: string;
  type: "movie" | "tv";
  list: "watched" | "watchlist";
  /** YYYY-MM-DD, when you watched it (or added it) */
  date?: string;
};

/** Reads CSV: quoted fields, "" inside quotes, commas and newlines in titles, CRLF, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  const s = text.startsWith("\uFEFF") ? text.slice(1) : text;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  return rows.filter((r) => r.some((f) => f.trim()));
}

/** CSV text to objects keyed by the header row. */
function records(text: string): Record<string, string>[] {
  const [head, ...rest] = parseCsv(text);
  if (!head) return [];
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const day = (s: string | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined);
const year = (s: string | undefined) => (s && /^\d{4}$/.test(s) ? Number(s) : undefined);

// IMDb's "Title Type": films become movies, series become series, single episodes can't be placed.
const IMDB_MOVIE = /^(movie|tv ?movie|short|video|tv special)$/i;
const IMDB_SERIES = /^(tv ?series|tv ?mini ?series)$/i;

/**
 * Turns the files of an export into rows. Files are recognised by their columns, so names don't matter.
 * `skipped`: rows that can't become a Lateshow title (IMDb episodes, a watched series without its episodes).
 */
export function readExport(files: { name: string; text: string }[]): { rows: ImportRow[]; skipped: number } {
  const rows: ImportRow[] = [];
  let skipped = 0;
  // Letterboxd: the diary has the real watch dates, watched.csv everything (dated when logged). Diary first wins.
  const lb = (f: { name: string }) => f.name.replace(/^.*\//, "").toLowerCase();
  const order = (f: { name: string }) => ["diary.csv", "watched.csv", "watchlist.csv"].indexOf(lb(f));
  for (const file of [...files].sort((a, b) => order(a) - order(b))) {
    const recs = records(file.text);
    const cols = recs[0] ? Object.keys(recs[0]) : [];
    if (cols.includes("Letterboxd URI")) {
      const name = lb(file);
      if (!["diary.csv", "watched.csv", "watchlist.csv"].includes(name)) continue; // ratings, reviews, likes
      for (const r of recs) {
        if (!r.Name) continue;
        rows.push({
          title: r.Name,
          year: year(r.Year),
          type: "movie",
          list: name === "watchlist.csv" ? "watchlist" : "watched",
          date: day(r["Watched Date"]) ?? day(r.Date),
        });
      }
    } else if (cols.includes("Const")) {
      // ratings.csv has "Date Rated" (rated means watched), a list export (watchlist) has "Created"
      const rated = cols.includes("Your Rating");
      for (const r of recs) {
        const kind = r["Title Type"] ?? "";
        const type = IMDB_MOVIE.test(kind) ? "movie" : IMDB_SERIES.test(kind) ? "tv" : null;
        if (!type || !/^tt\d+$/.test(r.Const) || (rated && type === "tv")) {
          skipped++;
          continue;
        }
        rows.push({
          title: r.Title,
          year: year(r.Year),
          imdbId: r.Const,
          type,
          list: rated ? "watched" : "watchlist",
          date: day(r["Date Rated"]) ?? day(r.Created),
        });
      }
    }
  }
  // one row per title and list (a rewatch in the diary is one watched film)
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = `${r.list}|${r.imdbId ?? `${norm(r.title)}|${r.year ?? ""}`}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { rows: unique, skipped };
}

/** Lowercase, no accents, no punctuation: "Amélie" and "Amelie", "Se7en" and "Se7en." compare equal. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type Hit = { id: number; title: string; originalTitle?: string; year?: number };

/**
 * Which search hit is the film in the file: the one with the same title and year (±1, Letterboxd sometimes has the
 * festival year). One clear match: its id. Several, or a year that fits none: up to 3 candidates to pick from.
 */
export function pickMatch(row: Pick<ImportRow, "title" | "year">, hits: Hit[]): { id: number } | { candidates: Hit[] } {
  const t = norm(row.title);
  const same = hits.filter((h) => norm(h.title) === t || (h.originalTitle && norm(h.originalTitle) === t));
  const pool = same.length ? same : hits;
  if (row.year) {
    const exact = pool.filter((h) => h.year === row.year);
    if (exact.length === 1 && same.length) return { id: exact[0].id };
    const near = pool.filter((h) => h.year && Math.abs(h.year - row.year!) <= 1);
    if (near.length === 1 && same.length) return { id: near[0].id };
  } else if (same.length === 1) return { id: same[0].id };
  return { candidates: pool.slice(0, 3) };
}
