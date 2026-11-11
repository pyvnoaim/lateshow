# Lateshow

Movies and series: find what to watch, where to stream it, track what you watched.
Personal, non-commercial (TMDB key terms): no ads, no paid features, ever. lateshow.app / .film not bought yet.
Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Run

- `pnpm dev --port 3000`, `pnpm check` (prettier + typecheck + eslint + vitest) must pass before every commit.
- `.env.local`: `TMDB_TOKEN` (Read Access Token), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. See `.env.example`.
- DB: `data/lateshow.db` (gitignored). `pnpm db:generate` / `pnpm db:migrate`. Auth schema via `npx @better-auth/cli generate`.
- Dev prints the sign-in link in the terminal.
- Gotcha: Turbopack serves stale CSS after editing `@utility`/`@theme`. Stop server, `rm -rf .next`, restart, check served CSS.
- Private repo github.com/pyvnoaim/lateshow (main). Commit often, push only when the user says so, via push-gate.

## Copy rules (visible text)

- No em dashes, no semicolons.
- Break lines at phrase boundaries, no orphans (`text-wrap: balance` on headings, `pretty` on paragraphs).

## Stack

Next.js 16 App Router (Cache Components, Turbopack), React 19, TS strict, Tailwind v4 (tokens only), Radix, lucide-react,
SQLite + Drizzle, Better Auth magic link (15 min, hashed tokens), zod, Vitest, Prettier, Playwright screenshots.
Later: Resend emails, Docker on the VPS behind Nginx Proxy Manager + Cloudflare, SSE for rooms.

## Data

- TMDB v3 (bearer token, server only): everything about titles, plus `discover` for picks and filters.
- JustWatch unofficial GraphQL (`apis.justwatch.com/graphql`): direct "Watch on" links and the Top 10. Can break anytime,
  `lib/justwatch.ts` returns [] on failure. Fallback if it dies: Streaming Availability API (RapidAPI free).
- Language: every TMDB function takes `lang` last (caches per language), callers get it from `getRegion()`.
- Country: auto-detected from `cf-ipcountry` / `x-vercel-ip-country`, default DE, nothing stored (`lib/region.ts`).
  Every country-dependent function takes the country as a param so caches are per country.
- No tracking, so no cookie banner. TMDB attribution only on /about. Legal links only, no piracy.

## Structure

```
src/app/         routes only: read params, call a feature, render. (main) group = TopBar + Footer
src/features/    titles, discover, profile, auth, search. Own UI + logic
src/components/  shared UI, ui/ = kit (Container, Section, PosterGrid, SegmentedTabs, ProgressBar, buttonStyles, field)
src/lib/         tmdb, justwatch, env, region, auth, db/, library/ (watched + watchlist: queries, actions, progress)
```

Lint-enforced: no default exports outside route files, no `../` imports, `app/` can't import `lib/tmdb|justwatch|db`,
features can't import each other, `components/` and `lib/` can't import features, no arbitrary Tailwind `[values]`.
Also: data access is `server-only`, only `lib/env.ts` reads `process.env`, writes are zod-validated server actions,
pure logic extracted with a `*.test.ts` beside it, no barrel files, move code to `components/` only when a 2nd feature needs it.

## Styling

- Every value is a token in `src/app/globals.css` (`@theme`), named by role. Missing one? Add a token.
  Names must not collide across namespaces (`--spacing-page` broke `max-w-page`).
- Global CSS only in `@layer base` or `@utility`, never unlayered selectors.
- Glass family: `glass` (clear), `glass-tint` (primary), `glass-accent` (on state), `glass-cell` (small tiles), `glass-hover`
  (quiet links). Pointer sheen via `GlassSheen`. Write only standard `backdrop-filter`.
- Motion utilities: `press` (buttons), `lift` (cards in a `group`), `sk` (skeleton shimmer), `rise`, `stagger`.
- Tooltips: never `title`. Use `data-tip` (+ `data-tip-meta`), one global `Tooltips`. Icon-only buttons always get one.

## Design

- Apple TV style: near-black, Inter Tight, tight headlines, no borders or cards, posters carry the color, accent #2997ff.
- Premium comes from states, glass, motion and type, never decoration motifs.
- Switchers are plain text (active white, rest grey). Posters stay clean, extra actions go in the caption line.
- Top bar scrolls away (absolute). Inputs are glass pills like search.
- Rejected, don't bring back: white pill switchers, dock nav, frosted fixed bar on scroll, poster glow, cinema motifs,
  serif accents, play button on posters, moving hover arrows.
- Every poster caption is the same everywhere (`PosterCaption`): Type · Year · Genre + small service icon.
- Every page: press feel, shaped skeletons (no spinners), reserved image space + blur-up, optimistic toggles, tabular nums,
  visible focus ring, empty states with one action, Esc closes overlays, `/` opens search.
- Screenshot desktop and phone after every UI change before calling it done.
- Drafts canvas: https://claude.ai/artifact/8EkS5HkArQEZrCnRYzy1vi

## Built

Top bar (search with live results, account, phone menu), footer, home (hero carousel or continue watching, rows:
continue, new episodes, Can't decide?, watchlist, Top 10, trending, because you watched, new on streaming, cinemas, hidden gems),
/cinemas calendar, /search (type + genre filters in the URL, browse a genre without a query), title page (where to watch, trailer, episodes + ratings grid, cast, more like), sign in with `?next=`,
profile /u/me (stats, heatmap, history, watchlist), /settings (your services: My services tab on Trending,
picks only from them, your service first in captions and Watch on, language for TMDB data in a cookie, else the browser's, name, spoiler guard cookie, CSV export at /api/export,
delete account), /watchlist + /u/me redirects in `next.config.ts`, 404, errors, /about.

## Todo (in order)

- [ ] Before public: privacy page + Impressum, Resend, nightly SQLite backup off the VPS, Docker deploy, buy lateshow.app.
- [ ] Later: genre/mood row, TMDB account import, imports (Netflix CSV, Letterboxd, Trakt).
- [ ] Friends (decided 2026-11-11): mutual, by invite link only (7 days, few uses), no people search.
      Friends see everything by default, one Settings switch hides it. Tables: `user.username`, `friendship`
      (one row per pair, lower id first), `invite`. Access checked in one helper. Build order:
      1 username + `/u/[username]` · 2 invite, accept, remove · 3 Friends tab + friends' profiles + privacy switch ·
      4 "Friends this week" row + friends on title pages · 5 taste match % (shown from 10 titles each).
- [ ] Rooms (nav link hidden): Movie or Series first, swipe to match, 8-title bracket, category wheel.
