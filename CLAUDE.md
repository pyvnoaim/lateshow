# Lateshow

Website for movies and series: find what to watch, where to watch it, and track what you've watched.
Name decided 2026-11-10. lateshow.app and lateshow.film were unregistered that day (registry RDAP check), not bought yet.

## Status

- Step 1 in progress (2026-11-09): Next.js 16.4 app scaffolded (Cache Components + Partial Prefetching on, read
  `node_modules/next/dist/docs/` before using Next APIs, see AGENTS.md). Built: `/` (trending grid) and
  `/title/[type]/[id]` (backdrop hero, Watch on <service> via JustWatch, trailer dialog, where to watch, heatmap,
  episodes with season tabs, cast, more like this). Poster morphs into the hero via React `<ViewTransition>`.
- Needs `TMDB_TOKEN` (TMDB "API Read Access Token") in `.env.local`, see `.env.example`.
- Code map: `src/lib/tmdb.ts` (cached TMDB calls), `src/lib/justwatch.ts` (watch links, returns [] on any failure),
  `src/components/` (TmdbImage blur-up, PosterLink, Heatmap, Episodes, Trailer), tokens in `src/app/globals.css`
  (default Tailwind palette wiped, only design system colors exist).

Design draft (canvas, 3 pages): https://claude.ai/artifact/CXbsoho5g1QCQkmL31d93N

## Copy rules (all user-facing text)

- No em dashes (—).
- No semicolons (;).
- Line breaks that make sense: break headlines at phrase boundaries ("Everything you watch.<br>One place."), no orphan words.
  CSS: `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
- Code and CSS are exempt, only visible text counts.

## Layers (build in order, each works without the next)

Minimal design, few features, mostly quality of life (decided 2026-11-10).

1. **Core**
   - Home: search, "Continue watching", trending (All / Movies / Series / On my services), watch room CTA, "I can't decide".
   - Title page (what clicking a poster opens): backdrop hero, overview, Mark next episode watched, watchlist, mark watched.
     Where to watch in Germany with direct "Watch on <service> ↗" links, trailer, "Because you liked X" row,
     episode ratings heatmap (brighter = better, ring = seen), episode list with season tabs and watched ticks, cast.
   - "I can't decide" (solo): pick Movie or Series, get 3 picks from your services.
2. **Profile**
   - Watched history, watchlist, progress per show, stats (hours, movies, episodes, top genre, genres, hours per month).
   - Import history from Netflix (viewing history CSV), Letterboxd and Trakt exports.
3. **Friends**
   - Follow by link or username, friends' activity this week, taste match %, friends' ratings on title pages, invite friends to rooms.
4. **Watch together rooms**
   - Every pick game starts with one choice: Movie or Series. The game then only uses that type. The host picks it.
   - Default: everyone swipes on titles available on the group's shared services, first match wins.
   - Game mode, main game: tournament bracket, 8 titles, vote head to head 8 → 4 → 2 → 1.
   - Category wheel: everyone adds a category, wheel spins, 3 picks from it.

### Later (not planned now)

- Calendar feed (.ics) of new episodes. Alerts when watchlist titles leave your services. Rating titles.

### Cut (2026-11-10)

- Claude spoiler-free recaps, year in review card, hot seat game.

## Data (must be free)

- **TMDB** (free key, one signup, key stays on the server): search, posters, backdrops, episodes, ratings, cast, trailers (YouTube keys), recommendations, which services carry a title per country.
- **Which services carry a title** (per country): TMDB watch providers (official, data comes from JustWatch, 140+ countries). Decided 2026-11-10.
  JustWatch coverage and deep links are best in big markets (DE, EU, US, UK), thinner in small countries.
- **Direct "Watch on" links**: JustWatch's unofficial GraphQL endpoint (`apis.justwatch.com/graphql`, no key, `offers.standardWebURL`).
  Unofficial and undocumented, can break or block anytime, gray area in their terms. Fine for a small site.
  - Fallback 1: link to the service's search page with the title prefilled.
  - Fallback if the site grows: Streaming Availability API (Movie of the Night, RapidAPI free plan ~100 requests/day, no card) with a ~1 day cache, or JustWatch's paid official API.
- Watchmode (~1,000 req/month free) considered; unclear if deep links are on the free plan.
- Apple TV+ links (`tv.apple.com`) open the TV app on macOS; Netflix/Prime/Disney+ open in the browser.
- Streaming info country: Germany by default, switchable.
- No piracy: only links to legal services.
- TMDB key is registered as personal, non-commercial use (2026-11-09). The site must make no money: no ads, subscriptions or paid features.
  Monetizing needs TMDB's commercial license first. TMDB attribution (logo + "Data and images from TMDB") required on every page.

## Accounts

- Browsing, title pages and watch links: no login.
- Profile and friends need an account: passwordless email link login (no passwords).
- Simplest alternative for profile only: local browser storage (one device, no sync). Friends rules this out, so accounts it is.

## Stack (decided 2026-11-09)

One Next.js app on the VPS. No separate backend, no paid services.

- Framework: Next.js App Router, React, TypeScript. TMDB key server-side only. `<Link>` prefetch, `next/image` for TMDB sizes.
- Styling: Tailwind, theme = the design system tokens only (6 colors, 5 type sizes, radii, spacing).
- Interactive primitives: Radix (menus, dialogs, tabs). About 8 own components, no UI kit.
- Motion: Motion (motion.dev) for springs and stagger, browser View Transitions API for poster → title page.
- Icons: lucide-react.
- Database: SQLite via Drizzle (from layer 2).
- Auth: Better Auth with the magic link plugin (passwordless email link).
- Email: Resend free plan (~3,000/month) for login links.
- Data: TMDB + JustWatch GraphQL (see Data), responses cached (Next fetch cache, JustWatch links in SQLite ~1 day).
- Calendar: a route handler that writes the `.ics` text by hand, no library.
- Hosting: Docker on the VPS behind Nginx Proxy Manager, Cloudflare DNS, domain lateshow.app (also lateshow.film), not bought yet.
- Screenshot checks: Playwright (playwright-core + system Chrome).
- Backups: nightly copy of the SQLite file off the VPS, set up in layer 2 BEFORE the first real account. There are no backups anywhere today.
- Realtime for watch rooms (layer 4): server-sent events from the same Next.js app, no extra service (decided 2026-11-10).
- Considered and skipped: SvelteKit (lighter, but Radix and Motion are React), Astro (better for content sites).

## Project structure (decided 2026-11-10)

Routes stay thin, code is grouped by feature. Changing a feature means touching one folder.

```
src/
  app/                      routes only: page.tsx / layout.tsx / route.ts, read params, call a feature, render
    page.tsx                /
    title/[type]/[id]/      /title/tv/1396
    search/                 /search?q=
    u/[username]/           profile (Overview / History / Watchlist tabs)
    import/  login/
    rooms/[code]/           watch together room
    api/auth/[...all]/      Better Auth
    api/rooms/[code]/events/  SSE stream
  features/                 one folder per feature, owns its UI + logic + data access
    titles/                 title page, episodes, heatmap, trailer, watch links
    library/                watched, watchlist, progress, import (server actions + queries)
    profile/                stats, year heatmap, history
    discover/               home rows, trending, "Can't decide?"
    friends/  rooms/  auth/
      components/           UI used only by this feature
      actions.ts            server actions ("use server"), validate input with zod
      queries.ts            reads (db / tmdb), server-only
      *.test.ts             Vitest next to the logic it tests
  components/               shared UI used by 2+ features (TopBar, Dock, UpNextChip, PosterLink, TmdbImage, Button, Tabs)
  lib/                      infrastructure, no UI: tmdb.ts, justwatch.ts, db/ (client + schema), auth.ts, env.ts
e2e/                        Playwright screenshot / flow checks
```

Rules:
- `app/` holds no business logic and no direct db or API calls. It imports from `features/`.
- A feature never imports another feature's internals. Shared things move to `components/` or `lib/`.
  Move a component to `components/` only when a second feature needs it.
- All TMDB / JustWatch / db access is server-only (`import "server-only"`). Keys never reach the browser.
- Writes are server actions in the feature's `actions.ts`, validated with zod. `api/` routes only where a URL is required (auth, SSE).
- Env vars are read once in `lib/env.ts` and validated at startup, nowhere else.
- Names: components PascalCase.tsx, everything else camelCase.ts, folders kebab-case. Named exports, no default exports except Next's page/layout files.
- TypeScript strict, no `any`. ESLint must pass. Tests: Vitest for logic (actions, import parsers, stats), Playwright for page checks.
- No barrel `index.ts` files. Import the file directly.

## Design decisions

- Look: "Apple TV style", chosen over editorial light, cinematic backdrop and mono.
  Near-black (#000), Inter Tight with huge tight headlines (negative letter spacing), no borders or cards,
  posters and backdrops carry all the color, white pill primary buttons, frosted glass secondary buttons,
  one accent #2997ff for progress, watched ticks and "leaves in N days". Muted text #86868b, surfaces #1d1d1f / #111112.
- No signature motif. Plain black stays. Tried and rejected: ambient poster-color glow behind pages (liked as a concept board,
  disliked once applied to the real pages), cinema craft (letterbox, grain, mono details), serif accent type (Instrument Serif italic), ticket stubs.
  Premium has to come from states, glass, motion and type details, not decoration.
- Navigation (picked 2026-11-10 on the canvas "Lateshow drafts", https://claude.ai/artifact/8EkS5HkArQEZrCnRYzy1vi):
  top bar = name left, wide glass search center (`/` focuses it), "up next" chip right (play + show + S2 E4 + progress, opens the service).
  Bottom = floating glass dock: Home, Watchlist, Rooms, You. Chip hidden on Home (the hero is already Continue watching).
  Phone: top bar shrinks to name + search icon, dock stays.
- Page drafts on that canvas: full-bleed backdrop hero on Home and Title, compact episode list with ratings grid beside it,
  profile led by one big sentence ("312 hours watched.") + Watching cards + year heatmap (white) + recent posters, History/Watchlist as tabs.
  Posters 2:3, 10 px corners, 1 px 8% white inner outline.
- Sign in page (canvas "Sign in", approved 2026-11-10): only the name at the top, no search or dock. Headline "Everything you watch. One place.",
  email + white "Email me a link" button inside ONE glass pill (same shape as the search bar). Then "Check your inbox." state with resend after 30 s.
  Rule: inputs are glass pills like search, never boxes with their own radius.
- Posters in the draft are colored placeholder blocks until TMDB images are in.
- Design system (own, no UI kit), drawn on the canvas as "Design system":
  - Colors (only these 6): bg #000, surface #111112, raised #1d1d1f, text #f5f5f7, muted #86868b, accent #2997ff.
  - Type: Inter Tight, sizes 104 hero / 56 page / 32 section / 17 body / 14 small, headlines bold with tight tracking.
  - Radius: 12 thumbnail, 14 poster, 28 banner, full round buttons. Spacing in 4 px steps, 72 between page sections.
  - Components: primary / glass / icon buttons, poster card, progress bar, pill tabs, search field, episode row, heatmap cell.
  - Icons: Lucide (1.75 px, 20 px). Motion: under 300 ms, springy, posters grow 3% on hover, tabs slide.
  - Code: Tailwind with these as the theme, Radix only for menus, dialogs, tabs.

## Premium checklist (every page must pass, approved via canvas board "Premium lab")

1. Press feel: buttons scale to 0.95 on press, 120 ms ease-out.
2. Poster hover: scale 1.05 plus shadow, 240 ms, cubic-bezier(.2,.8,.2,1).
3. Loading: shimmer skeletons shaped like the content, never spinners.
4. Images: space reserved before load (no layout jump), blurred placeholder sharpens in 600 ms. TMDB sizes chosen per screen.
5. Instant response: watched ticks, ratings, watchlist update optimistically with a small pop, save in background.
6. Rows: poster rows fade up one after another, 80 ms apart.
7. Numbers: `font-variant-numeric: tabular-nums` for ratings, stats, counts.
8. Focus: visible 2 px #2997ff ring with 3 px offset on `:focus-visible`.
9. Empty states: a short headline plus one action (e.g. "Nothing watched yet." + Import from Netflix). Errors say what happened.
10. Opening a title: the poster grows into the title page (View Transitions API).
- Plus: prefetch title pages on poster hover, `/` focuses search, Esc closes overlays.
- Process: polish the title page fully first as the bar. Screenshot desktop and phone width after every UI change before calling it done.
  Show ideas on real pages, not concept boards, before committing.

## Open

- Verify current free limits of JustWatch GraphQL / Streaming Availability before building links.
- Next design pass: Watch on button, trailer, "Because you liked" on title page; import, friends on profile;
  new import page; room screen with bracket; wheel on home.
