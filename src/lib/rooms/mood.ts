/** What a mood means for TMDB's discover: genres (any of them), a length, an era. Empty when we don't know it. */
export type MoodQuery = {
  movieGenres: number[];
  tvGenres: number[];
  maxMinutes?: number;
  from?: string;
  to?: string;
};

// word -> [movie genres, series genres]. Series genres differ on TMDB (Sci-Fi & Fantasy is one).
const WORDS: [RegExp, number[], number[]][] = [
  [/\baction\b|\bexplosions?\b/, [28], [10759]],
  [/\bcomed(y|ies)\b|\bfunny\b|\blaughs?\b|\bfeel[- ]?good\b|\blight\b|\bhappy\b/, [35], [35]],
  [/\bdrama\b|\bemotional\b|\bcry\b/, [18], [18]],
  [/\bcrime\b|\bheist\b|\bgangsters?\b/, [80], [80]],
  [/\bthriller\b|\btense\b|\bsuspense\b/, [53], [9648, 80]],
  [/\bhorror\b|\bscary\b|\bspooky\b|\bcreepy\b/, [27], [9648]],
  [/\bsci[- ]?fi\b|\bscience fiction\b|\bspace\b|\bfuture\b/, [878], [10765]],
  [/\bfantasy\b|\bmagic(al)?\b/, [14], [10765]],
  [/\bmyster(y|ies)\b|\bmind[- ]?bending\b|\btwist(y|s)?\b|\bpuzzle\b/, [9648, 878], [9648, 10765]],
  [/\broman(ce|tic)\b|\blove\b|\bdate night\b/, [10749], [18]],
  [/\banimat(ed|ion)\b|\banime\b|\bcartoons?\b/, [16], [16]],
  [/\bfamily\b|\bkids\b|\bcozy\b|\bcosy\b|\bwholesome\b/, [10751], [10751]],
  [/\bdocumentar(y|ies)\b|\btrue story\b|\breal life\b/, [99], [99]],
  [/\bwar\b/, [10752], [10768]],
  [/\bwestern\b|\bcowboys?\b/, [37], [37]],
  [/\bmusic(al)?\b/, [10402], [10402]],
  [/\bhistor(y|ical)\b|\bperiod\b/, [36], [10768]],
];

/** Reads a typed mood: "Mind-bending", "cozy 90s", "under 100 min", "80s classics". Pure. */
export function parseMood(raw: string, today = new Date()): MoodQuery {
  const text = raw.toLowerCase();
  const q: MoodQuery = { movieGenres: [], tvGenres: [] };
  for (const [re, movie, tv] of WORDS) {
    if (!re.test(text)) continue;
    q.movieGenres.push(...movie.filter((g) => !q.movieGenres.includes(g)));
    q.tvGenres.push(...tv.filter((g) => !q.tvGenres.includes(g)));
  }
  const minutes = text.match(/\bunder (\d{2,3})\s*(min|minutes|m)\b/);
  if (minutes) q.maxMinutes = Number(minutes[1]);
  else if (/\bshort\b|\bquick\b/.test(text)) q.maxMinutes = 100;
  const decade = text.match(/\b(?:19)?([2-9]0)s\b|\b(20[0-2]0)s\b/);
  if (decade) {
    const start = decade[2] ? Number(decade[2]) : 1900 + Number(decade[1]);
    q.from = `${start}-01-01`;
    q.to = `${start + 9}-12-31`;
  } else if (/\bclassics?\b|\bold\b/.test(text)) q.to = "1999-12-31";
  else if (/\bnew\b|\brecent\b|\blatest\b/.test(text)) q.from = `${today.getUTCFullYear() - 2}-01-01`;
  return q;
}

/** True when a mood says nothing we can filter by (then TMDB's keyword search gets a try). Pure. */
export const isEmptyMood = (q: MoodQuery) => q.movieGenres.length === 0 && !q.maxMinutes && !q.from && !q.to;

/** Suggestions under the field, so nobody stares at an empty box. */
export const MOOD_IDEAS = ["Cozy", "Mind-bending", "Scary", "Feel good", "Under 100 min", "90s classics"];
