/**
 * Import from Letterboxd (export ZIP), IMDb (ratings / watchlist CSV), Netflix (viewing history CSV) and Prime Video (the
 * CSV of the community "Watch History Exporter for Amazon Prime Video" script). Pure, runs in the browser (reading the
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
  /** your score out of 10 (IMDb as is, Letterboxd stars doubled), becomes a rating via `fromScore` */
  score?: number;
  /**
   * The site's own ids for this title ("prime:amzn1.dv.gti…", a show has one per season): once you confirmed a match,
   * Lateshow remembers it and the next import skips the search.
   */
  refs?: string[];
  /** Netflix, Prime Video: the episodes you watched of this series (season unknown when the file names none) */
  episodes?: NetflixEpisode[];
};

/** Where an import came from: shown with it in Settings, so it can be removed as a whole */
export type ImportSource = "Prime Video" | "Letterboxd" | "IMDb" | "Netflix" | "Crunchyroll";

/**
 * One watched episode as a site names it. `episode`: its number when the site gives one. `airDate` (Crunchyroll):
 * when it first aired, the surest way to place anime whose seasons TMDB splits differently. `absolute`: its number
 * counted through all seasons. `undated`: watched, but the day isn't known (a season marked watched in one go).
 */
export type NetflixEpisode = {
  season?: number;
  episode?: number;
  name: string;
  date?: string;
  airDate?: string;
  absolute?: number;
  undated?: true;
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
export function readExport(files: { name: string; text: string }[]): {
  rows: ImportRow[];
  skipped: number;
  source: ImportSource;
} {
  const rows: ImportRow[] = [];
  let skipped = 0;
  let source: ImportSource | undefined; // the first file that's recognised names it
  // Letterboxd: the diary has the real watch dates, watched.csv everything (dated when logged). Diary first wins.
  const lb = (f: { name: string }) => f.name.replace(/^.*\//, "").toLowerCase();
  const FILES = ["diary.csv", "watched.csv", "ratings.csv", "watchlist.csv"];
  const order = (f: { name: string }) => FILES.indexOf(lb(f));
  for (const file of [...files].sort((a, b) => order(a) - order(b))) {
    const recs = records(file.text);
    const cols = recs[0] ? Object.keys(recs[0]) : [];
    if (cols.includes("Date Watched") && cols.includes("Episode Title")) {
      const read = readPrime(recs);
      rows.push(...read.rows);
      skipped += read.skipped;
      source ??= "Prime Video";
    } else if (cols.includes("Letterboxd URI")) {
      source ??= "Letterboxd";
      const name = lb(file);
      if (!FILES.includes(name)) continue; // reviews, likes, lists
      for (const r of recs) {
        if (!r.Name) continue;
        rows.push({
          title: r.Name,
          year: year(r.Year),
          type: "movie",
          list: name === "watchlist.csv" ? "watchlist" : "watched",
          date: day(r["Watched Date"]) ?? day(r.Date),
          score: Number(r.Rating) * 2 || undefined,
        });
      }
    } else if (cols.includes("Title") && cols.includes("Date") && !cols.includes("Const")) {
      const read = readNetflix(recs);
      rows.push(...read.rows);
      skipped += read.skipped;
      source ??= "Netflix";
    } else if (cols.includes("Const")) {
      source ??= "IMDb";
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
          score: Number(r["Your Rating"]) || undefined,
        });
      }
    }
  }
  // one row per title and list (a rewatch in the diary is one watched film). The first row wins, a later one
  // (ratings.csv) can still bring the score.
  const seen = new Map<string, ImportRow>();
  const unique = rows.filter((r) => {
    const key = `${r.list}|${r.imdbId ?? `${norm(r.title)}|${r.year ?? ""}`}`;
    const first = seen.get(key);
    if (first) {
      first.score ??= r.score;
      return false;
    }
    seen.set(key, r);
    return true;
  });
  return { rows: unique, skipped, source: source ?? "Letterboxd" };
}

// "Season 2", "Part 2", "Series 2", "Staffel 2", "2nd Season", "Limited Series" (= 1)
function seasonOf(label: string, series: string): number | undefined {
  const n = seasonNumber(label, series);
  // "Season 2024" (a yearly show) isn't a season number the import can place: left to the name, which finds it
  return n !== undefined && n <= 500 ? n : undefined;
}
function seasonNumber(label: string, series: string): number | undefined {
  const m =
    /^(?:season|series|part|staffel|volume|book|collection) (\d+)$/i.exec(label) ??
    /^(\d+)(?:st|nd|rd|th) season$/i.exec(label);
  if (m) return Number(m[1]);
  if (/^(limited series|miniseries|mini-series)$/i.test(label)) return 1;
  // Stranger Things: "Stranger Things 4: Chapter One"
  const rest = label.toLowerCase().startsWith(`${series.toLowerCase()} `) ? label.slice(series.length + 1) : "";
  return /^\d+$/.test(rest) ? Number(rest) : undefined;
}

/**
 * Netflix only gives "Series: Season 1: Episode name" or a film's title, and the day. A title with colons is a series
 * when one of its rows has two colons or names a season, or its first part comes up 3 times or more (else "Hotel Transylvania 3: Summer
 * Vacation" is a film). Dates are M/D/YY in US exports, D/M/YYYY or D.M.YY elsewhere: a first part over 12 decides.
 */
function readNetflix(recs: Record<string, string>[]): { rows: ImportRow[]; skipped: number } {
  const parsed = recs.map((r) => {
    const parts = r.Title.split(": ");
    // "The Office (U.S.)": TMDB knows it as "The Office", the episodes pick the right one
    const series = parts[0].replace(/\s*\((?:U\.S\.|U\.K\.|US|UK)\)$/, "").trim();
    const season = parts.length > 2 ? seasonOf(parts[1].trim(), series) : undefined;
    const name = parts
      .slice(season === undefined ? 1 : 2)
      .join(": ")
      .trim();
    return { title: r.Title.trim(), series, season, name, deep: parts.length > 2, rawDate: r.Date };
  });
  const dayFirst = parsed.some((p) => Number(p.rawDate.split(/[/.]/)[0]) > 12 || p.rawDate.includes("."));
  const date = (s: string) => {
    const [a, b, c] = s.split(/[/.]/).map(Number);
    if (!a || !b || !c) return undefined;
    const [m, d] = dayFirst ? [b, a] : [a, b];
    const y = c < 100 ? 2000 + c : c;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  const count = new Map<string, number>();
  const labelled = new Set<string>();
  for (const p of parsed) {
    if (p.name) count.set(p.series, (count.get(p.series) ?? 0) + 1);
    if (p.season !== undefined || p.deep) labelled.add(p.series);
  }
  const shows = new Map<string, ImportRow>();
  const films: ImportRow[] = [];
  let skipped = 0;
  // the file is newest first: walking it backwards keeps the first time you saw each episode
  for (const p of parsed.reverse()) {
    if (!p.title) continue;
    if (!p.series) {
      skipped++; // Netflix sometimes leaves the series name out (" : Episode 3")
      continue;
    }
    const isShow = p.name && (labelled.has(p.series) || (count.get(p.series) ?? 0) >= 3);
    if (!isShow) {
      films.push({ title: p.title, type: "movie", list: "watched", date: date(p.rawDate) });
      continue;
    }
    let show = shows.get(p.series);
    if (!show) shows.set(p.series, (show = { title: p.series, type: "tv", list: "watched", episodes: [] }));
    show.date = date(p.rawDate); // latest day, the row shows when you last watched
    const eps = show.episodes!;
    if (!eps.some((e) => e.season === p.season && norm(e.name) === norm(p.name)))
      eps.push({ season: p.season, name: p.name, date: date(p.rawDate) });
  }
  return { rows: [...shows.values(), ...films], skipped };
}

/**
 * Prime Video (the exporter script's CSV, newest first): "Series"/"Movie" rows with an exact time. A series title
 * carries its season ("The Boys - Season 1", "Lost - Staffel 1 [dt./OV]", "Hawaii Five-0, Season 8", "Lucifer:
 * Staffel 6", "Breadwinners Season 2", "House of David, S1", "South Park" none), the episode its number ("Episode 5: \"Good for the Soul\"", "Folge 3: ...").
 */
/**
 * A Prime Video title as TMDB names it: no dub or edition tags ("[dt./OV]", "(Uncut)", "(Theatrical Version)",
 * "(TV)"), a "(2016)" becomes the year, an article moved to the end comes back ("WHEEL OF TIME, THE").
 */
export function primeTitle(raw: string): { title: string; year?: number } {
  let title = raw.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  let year: number | undefined;
  for (let m; (m = /\s*\(([^()]*)\)$/.exec(title));) {
    if (/^\d{4}$/.test(m[1])) year ??= Number(m[1]);
    title = title.slice(0, m.index).trim();
  }
  const moved = /^(.*), (the|a|an|der|die|das)$/i.exec(title);
  if (moved) title = `${moved[2]} ${moved[1]}`;
  return { title, year };
}

function readPrime(recs: Record<string, string>[]): { rows: ImportRow[]; skipped: number } {
  let skipped = 0;
  const shows = new Map<string, ImportRow>();
  const films = new Map<string, ImportRow>();
  // walking it backwards keeps the first time you saw each episode or film
  for (const r of recs.toReversed()) {
    // a trailer Prime counts as watched ("Episode 0: Trailer Staffel 4") isn't a title
    if (/\btrailer\b/i.test(`${r.Title} ${r["Episode Title"]}`)) {
      skipped++;
      continue;
    }
    const { title, year } = primeTitle(r.Title);
    if (!title) continue;
    const date = day(r["Date Watched"]);
    const gti = r["Global Title Identifier"]?.trim();
    const ref = gti ? `prime:${gti}` : undefined;
    if (r.Type !== "Series") {
      if (!films.has(norm(title)))
        films.set(norm(title), { title, year, type: "movie", list: "watched", date, ...(ref && { refs: [ref] }) });
      continue;
    }
    const s = /^(.*?)[\s,:-]*\b(?:(?:season|staffel|series)\s+|s)(\d+)$/i.exec(title);
    // the tags can sit before the season too: "FROM (TV) - Season 1", "WHEEL OF TIME, THE (2021) - Season 2"
    const named = primeTitle(s ? s[1] : title);
    const series = named.title;
    if (!series) {
      skipped++; // the show's name left out ("Season 1")
      continue;
    }
    const season = s ? Number(s[2]) : undefined;
    const e = /^(?:episode|folge|ep\.?) (\d+)(?::\s*(.*))?$/i.exec(r["Episode Title"]);
    const episode = e ? Number(e[1]) : undefined;
    const name = (e ? e[2] : r["Episode Title"])?.replace(/^"(.*)"$/, "$1").trim() || `Episode ${episode}`;
    let show = shows.get(norm(series));
    if (!show)
      shows.set(
        norm(series),
        (show = { title: series, year: named.year ?? year, type: "tv", list: "watched", episodes: [] }),
      );
    show.date = date; // latest day
    if (ref && !show.refs?.includes(ref)) show.refs = [...(show.refs ?? []), ref]; // a season's id
    if (!show.episodes!.some((x) => x.season === season && x.episode === episode && norm(x.name) === norm(name)))
      show.episodes!.push({ season, episode, name, date });
  }
  return { rows: [...shows.values(), ...films.values()], skipped };
}

/** One entry of Crunchyroll's watch history API (content/v2/<account>/watch-history), the parts that matter */
export type CrunchyrollEntry = {
  id: string;
  date_played?: string;
  fully_watched?: boolean;
  panel?: {
    type?: string; // "episode", "movie"
    title?: string;
    episode_metadata?: {
      series_id?: string;
      series_title?: string;
      season_number?: number;
      episode_number?: number | null;
      sequence_number?: number;
      episode_air_date?: string;
      identifier?: string; // "GP5HJ84P7|S00352501|E3", the same for every dub of an episode
    };
    movie_metadata?: { movie_listing_title?: string };
  };
};

// this many episodes of one show in the very same second: a season marked watched in one go, not watched like that
const BULK = 5;

/**
 * Crunchyroll's watch history into rows: only what you watched to the end, every dub of an episode once (each
 * language is its own entry), the first time you watched it. A season marked watched in one go has no real day, its
 * episodes come in undated ("A while ago") instead of piling hours onto one heatmap day. Entries without details
 * (`panel`) are counted as skipped (the extension fills them in before).
 */
export function readCrunchyrollHistory(entries: CrunchyrollEntry[]): { rows: ImportRow[]; skipped: number } {
  const done = entries.filter((e) => e.fully_watched);
  const meta = (e: CrunchyrollEntry) => e.panel?.episode_metadata;
  const key = (e: CrunchyrollEntry) =>
    meta(e)?.identifier ?? `${meta(e)?.series_id}|${meta(e)?.season_number}|${meta(e)?.episode_number}`;
  const stamps = new Map<string, Set<string>>();
  for (const e of done) {
    const m = meta(e);
    if (!m?.series_id || !e.date_played) continue;
    const k = `${m.series_id}|${e.date_played}`;
    (stamps.get(k) ?? stamps.set(k, new Set()).get(k)!).add(key(e));
  }
  const shows = new Map<string, ImportRow>();
  const seen = new Set<string>(); // episodes you have, across dubs
  const films = new Map<string, ImportRow>();
  let skipped = 0;
  // oldest first: the first time you watched each one wins
  for (const e of done.toSorted((a, b) => (a.date_played ?? "").localeCompare(b.date_played ?? ""))) {
    const date = day(e.date_played);
    if (e.panel?.type === "movie") {
      const title = e.panel.movie_metadata?.movie_listing_title ?? e.panel.title;
      if (title && !films.has(norm(title))) films.set(norm(title), { title, type: "movie", list: "watched", date });
      continue;
    }
    const m = meta(e);
    if (!m?.series_id || !m.series_title) {
      skipped++;
      continue;
    }
    let show = shows.get(m.series_id);
    if (!show)
      shows.set(
        m.series_id,
        (show = {
          title: m.series_title,
          type: "tv",
          list: "watched",
          refs: [`crunchyroll:${m.series_id}`],
          episodes: [],
        }),
      );
    if (seen.has(key(e))) continue; // another dub of one you have
    seen.add(key(e));
    const undated = (stamps.get(`${m.series_id}|${e.date_played}`)?.size ?? 0) >= BULK;
    if (!undated) show.date = date; // latest day
    show.episodes!.push({
      season: m.season_number,
      episode: m.episode_number ?? undefined,
      name: e.panel?.title || `Episode ${m.episode_number ?? ""}`.trim(),
      ...(undated ? { undated: true as const } : { date }),
      airDate: day(m.episode_air_date),
      ...(Number.isInteger(m.sequence_number) && { absolute: m.sequence_number }),
    });
  }
  return { rows: [...shows.values(), ...films.values()], skipped };
}

/** One entry of Netflix's viewing activity (its AUI API, aui › viewingActivity), the parts that matter */
export type NetflixViewed = {
  movieID?: number;
  date?: number; // ms
  title?: string;
  episodeTitle?: string;
  seasonDescriptor?: string; // "Season 5", "Part 2", "Limited Series"
  series?: number; // a show's id, none for a film
  seriesTitle?: string;
};

/**
 * Netflix's viewing activity as the extension reads it (newest first) into rows: a show with the episodes you
 * watched (by name per season, Netflix gives no episode numbers), each the first time you saw it, a film once.
 * The day is your own (local), Netflix's ids come along as refs so a confirmed match is remembered.
 */
export function readNetflixHistory(items: NetflixViewed[]): { rows: ImportRow[]; skipped: number } {
  const local = (ms?: number) => {
    if (!ms) return undefined;
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const shows = new Map<number, ImportRow>();
  const films = new Map<number, ImportRow>();
  let skipped = 0;
  for (const v of items.toReversed()) {
    const date = local(v.date);
    // Netflix sometimes sends a name of only spaces: such an entry can't be matched, it's counted as skipped
    const seriesTitle = v.seriesTitle?.trim();
    const title = v.title?.trim();
    if (v.series && seriesTitle) {
      let show = shows.get(v.series);
      if (!show)
        shows.set(
          v.series,
          (show = { title: seriesTitle, type: "tv", list: "watched", refs: [`netflix:${v.series}`], episodes: [] }),
        );
      show.date = date; // latest day
      const season = v.seasonDescriptor ? seasonOf(v.seasonDescriptor, seriesTitle) : undefined;
      const name = v.episodeTitle?.trim() || title || "";
      if (name && !show.episodes!.some((e) => e.season === season && norm(e.name) === norm(name)))
        show.episodes!.push({ season, name, date });
    } else if (v.movieID && title && !v.series) {
      if (!films.has(v.movieID))
        films.set(v.movieID, { title, type: "movie", list: "watched", date, refs: [`netflix:${v.movieID}`] });
    } else skipped++;
  }
  return { rows: [...shows.values(), ...films.values()], skipped };
}

/** One title in Prime Video's own watch history data (the page's watch-history widget and its paging API). */
export type PrimeTitle = {
  titleType?: string; // "movie", "season", "episode"
  time?: number; // ms
  gti?: string;
  title?: { text?: string };
  children?: PrimeTitle[];
};

/**
 * Prime Video's watch history as the extension reads it (days newest first, each with its titles, a season with its
 * episodes as children) into rows, through the same reader as the exporter's CSV.
 */
/**
 * Only what you watched after `since` (ms), for "Read new": a season keeps just its newer episodes. Days come newest
 * first, so the reader can stop paging once a day is older.
 */
export function primeSince<D extends { titles?: PrimeTitle[] }>(days: D[], since: number): D[] {
  return days
    .map((d) => ({
      ...d,
      titles: (d.titles ?? []).flatMap((t) => {
        if (!t.children?.length) return (t.time ?? 0) > since ? [t] : [];
        const children = t.children.filter((e) => (e.time ?? t.time ?? 0) > since);
        return children.length ? [{ ...t, children }] : [];
      }),
    }))
    .filter((d) => d.titles.length);
}

export function readPrimeHistory(days: { titles?: PrimeTitle[] }[]): { rows: ImportRow[]; skipped: number } {
  const at = (ms?: number) => (ms ? new Date(ms).toISOString() : "");
  const recs = days.flatMap((d) =>
    (d.titles ?? []).flatMap((t) =>
      t.children?.length
        ? t.children.map((e) => ({
            "Date Watched": at(e.time ?? t.time),
            Type: "Series",
            Title: t.title?.text ?? "",
            "Episode Title": e.title?.text ?? "",
            "Global Title Identifier": t.gti ?? "",
          }))
        : [
            {
              "Date Watched": at(t.time),
              Type: t.titleType === "movie" ? "Movie" : "Series",
              Title: t.title?.text ?? "",
              "Episode Title": "",
              "Global Title Identifier": t.gti ?? "",
            },
          ],
    ),
  );
  return readPrime(recs);
}

// brackets don't count: Netflix "The Freelancer (No. 145)" is TMDB "The Freelancer"
const loose = (s: string) => norm(s.replace(/\([^)]*\)/g, " "));

/**
 * Netflix episodes to TMDB numbers by name: in the season the file names, then in any season (Netflix "Part 2" can be
 * TMDB season 1). Then the number (Prime Video gives one, "Episode 5" names one) in that season. A name after an arc
 * label counts too. Unknown names are counted as missed.
 * ponytail: exact names only. Anime arcs ("Dragon's Judgement") and renamed episodes miss, fuzzy matching if it matters.
 */
export function placeEpisodes<A extends { season: number; episode: number; name: string; airDate?: string }>(
  episodes: NetflixEpisode[],
  aired: A[],
): { placed: (A & { date?: string; undated?: true })[]; missed: number } {
  const names = new Map(aired.map((a) => [a, loose(a.name)])); // once, not per lookup
  // in airing order without specials: where an absolute number lands
  const regular = aired.filter((a) => a.season > 0).toSorted((x, y) => x.season - y.season || x.episode - y.episode);
  const placed: (A & { date?: string; undated?: true })[] = [];
  let missed = 0;
  for (const e of episodes) {
    // the air date first, if exactly one episode aired that day (or, across time zones, within a day)
    const near = (days: number) =>
      e.airDate
        ? aired.filter(
            (a) => a.airDate && Math.abs(Date.parse(a.airDate) - Date.parse(e.airDate!)) <= days * 86_400_000,
          )
        : [];
    const dated = [near(0), near(1)].find((l) => l.length === 1)?.[0];
    const n = loose(e.name);
    // an arc instead of a season ("Dragon's Judgement: The Ten Commandments"): the name after it counts too
    const tail = e.season === undefined ? loose(e.name.split(": ").slice(1).join(": ")) : "";
    const same = (a: A) => names.get(a) === n || (!!tail && names.get(a) === tail);
    const num = e.episode ?? Number(/^episode (\d+)$/.exec(n)?.[1] ?? NaN);
    const hit =
      dated ??
      aired.find((a) => a.season === e.season && same(a)) ??
      aired.find(same) ??
      (e.season !== undefined ? aired.find((a) => a.season === e.season && a.episode === num) : undefined) ??
      (e.absolute ? regular[e.absolute - 1] : undefined);
    if (hit) placed.push({ ...hit, date: e.date, ...(e.undated && { undated: true as const }) });
    else missed++;
  }
  return { placed, missed };
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
 * Which search hit is the title in the file: the one with the same title and year (±1, Letterboxd sometimes has the
 * festival year). One clear match: that hit. Several, or a year that fits none: up to 3 candidates to pick from.
 */
export function pickMatch<H extends Hit>(
  row: Pick<ImportRow, "title" | "year">,
  hits: H[],
): { match: H } | { candidates: H[] } {
  const t = norm(row.title);
  const same = hits.filter((h) => norm(h.title) === t || (h.originalTitle && norm(h.originalTitle) === t));
  const pool = same.length ? same : hits;
  if (row.year) {
    const exact = pool.filter((h) => h.year === row.year);
    if (exact.length === 1 && same.length) return { match: exact[0] };
    const near = pool.filter((h) => h.year && Math.abs(h.year - row.year!) <= 1);
    if (near.length === 1 && same.length) return { match: near[0] };
  } else if (same.length === 1) return { match: same[0] };
  return { candidates: pool.slice(0, 3) };
}

/**
 * How much of an import you watched each month, oldest first, every month in between included (an empty month is
 * a gap in the import screen's bars). Films count once, a series once per episode with its own day. Watchlist rows
 * and rows without a day are left out.
 */
export function watchMonths(rows: ImportRow[]): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  const add = (d?: string) => d && counts.set(d.slice(0, 7), (counts.get(d.slice(0, 7)) ?? 0) + 1);
  for (const r of rows) {
    if (r.list !== "watched") continue;
    // an undated episode (a season marked at once) has no month of its own
    if (r.episodes) r.episodes.forEach((e) => !e.undated && add(e.date ?? r.date));
    else add(r.date);
  }
  const keys = [...counts.keys()].sort();
  if (!keys.length) return [];
  const out: { month: string; count: number }[] = [];
  let [y, m] = keys[0].split("-").map(Number);
  for (let key = keys[0]; key <= keys[keys.length - 1];) {
    out.push({ month: key, count: counts.get(key) ?? 0 });
    if (++m > 12) {
      m = 1;
      y++;
    }
    key = `${y}-${String(m).padStart(2, "0")}`;
  }
  return out;
}
