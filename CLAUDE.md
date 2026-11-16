# Lateshow

Movies and series: find what to watch, where to stream it, track what you watched.
Personal, non-commercial (TMDB key terms): no ads, no paid features, ever. Live at https://lateshow.pyvno.xyz (2026-11-11). Buy lateshow.app only if it gets users
(then change `BETTER_AUTH_URL` in Portainer and `SITE_URL` in `src/lib/site.ts`, add the DNS record and NPM host).
Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Run

- `pnpm dev --port 3000`, `pnpm check` (prettier + typecheck + eslint + vitest) must pass before every commit.
- `.env.local`: `TMDB_TOKEN` (Read Access Token), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. See `.env.example`.
- DB: `data/lateshow.db` (gitignored). `pnpm db:generate` writes a migration, the server applies pending ones on start
  (`src/instrumentation.ts`, skipped during build). Auth schema via `npx @better-auth/cli generate`.
- Deploy: Portainer stack from this repo (like quorum), `build: .` + `pull_policy: build`, env vars in Portainer
  (stack.env), network `websites` (NPM proxies `lateshow:3000`), volumes `/data` + `/app/.next/cache`, `/api/health`.
  CI (`.github/workflows/ci.yml`): `pnpm check` on every push/PR, main then POSTs the stack webhook (secret
  `PORTAINER_WEBHOOK`). No GHCR: Packages budget is $0. Build needs no secrets (placeholder auth secret in the Dockerfile).
  URL for now: https://lateshow.pyvno.xyz (Cloudflare wildcard DNS).
- Sign in = 6 digit email code (Better Auth emailOTP, 10 min, 5 tries, hashed) + passkeys (@better-auth/passkey).
  Settings › Email changes the address with a code to the new one (emailOTP changeEmail, the current one isn't asked).
  Dev prints the code in the terminal (`Sign in code for <email>: 123456`). Prod sends through Resend
  (`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, see .env.example). Passkey table is hand-written in auth-schema.ts.
- Gotcha: Turbopack serves stale CSS after editing `@utility`/`@theme`. Stop server, `rm -rf .next`, restart, check served CSS.
- Gotcha: dev pages reloading themselves in a loop (empty page, "server could not finish this Suspense boundary") = stale Turbopack HMR state, every HMR connect sends an update it can only apply by a full reload. Same fix: stop, `rm -rf .next`, restart. Dev only, production has no HMR.
- Extension (`extension/`, MV3, one codebase for Chrome and Firefox/Zen, esbuild): `pnpm ext:build` (production),
  `ext:dev` (localhost:3000), `ext:test` (marks after 2% watched, never release), `ext:chrome` (Web Store zip without
  Firefox keys), `ext:zip` (Firefox zip + source zip for AMO). Load: Firefox about:debugging › Load Temporary Add-on,
  Chrome chrome://extensions › Load unpacked › extension/dist. Zen installs the signed .xpi and updates itself.
  Pieces: `reader.ts` (shared: one read at a time, `getJson`/`pageFetch`, `historyPage` = a sync's read when the popup
  opened the tab, else the card), `card.ts` (the import card on a history page), per site a reader + marking adapter
  (`prime.ts`, `crunchyroll.ts`, `netflix.ts`) and a page-world script for what only the page holds
  (`crunchyroll-main.ts` the API token, `netflix-main.ts` profile/build id + player clock, `prime-main.ts` the
  player's answers), `frame-video.ts` (Crunchyroll's player frame), `watch.ts` + `lib/watchProgress.ts` (tested:
  real watched seconds, ads don't count, credits or 90%, at least half watched), `toast.ts` (Marked · Undo, Which
  one?), `background.ts` (mark queue with retries, recent marks, sync jobs), `lateshow.ts` (on Lateshow: hands over
  import rows and the key, marks pages with `data-lateshow-extension`/`data-lateshow-key` (key id, never the secret),
  forwards Sync from Settings and its progress back), `popup.ts` (not connected / sync running or done / marked this
  week / one line per site with Sync and its switch).
  Key: Settings › Extension connects a browser (`ls_<id>_<secret>`, hashed, Bearer only, no cookie), it can only use
  /api/extension/mark (POST, DELETE = Undo), /me and /import. Browser names from the User-Agent (`browser`).
  Sync (2026-11-15): the popup or Settings asks background.ts, which opens the site's history in a background tab,
  the reader reads what's new since `synced[site]` without the card and hands the rows back, the tab closes, rows go
  to /api/extension/import in batches of 40 (`lib/extension/sync.ts` → `lib/library/importRun.ts`, the same import as
  Settings, never in a "use server" file since it takes a user id). Unclear titles wait in Settings. A job older than
  5 minutes counts as over. Sites, what the readers use:
  Netflix: AUI API `["aui","viewingActivity",page,50]` (form `param={"guid"}` + its `x-netflix.request.routing`
  headers, else BLOCKED), then `/nq/website/memberapi/release/metadata?movieid=<show or film>` per title for real
  season/episode numbers and the bookmark (only what you finished counts: offset past `watchedToEndOffset`, films
  90%). Marking: same metadata, clock from Netflix's player API (the <video> is off with ads), ads
  `[data-uia="ads-info-container"]`, credits = `watchedToEndOffset`.
  Prime: watch-history widget + `/api/getWatchHistorySettingsPage` paging (lists every episode you start, nothing
  tells finished from started). Marking: `prime-main.ts` reads the player's GetVodPlaybackResources answer (episode
  length without ads `fullTitleDurationMs`, credits `NEXT_UP` in transitionTimecodes) and asks playerChromeResources
  with `desiredResources=catalogMetadata` (show, season, number), ad seconds come off the video's time (ads are
  stitched in), ad = `.atvwebplayersdk-ad-timer-remaining-time`. Never set a Prime or Netflix <video>'s
  currentTime: their players break ("Video nicht verfügbar"), seek through their UI or API.
  Crunchyroll: content/v2/<account>/watch-history (only fully_watched), bare entries from cms/objects. Marking:
  episode from /watch/<id>, Crunchyroll's own fully_watched via playheads past 90%.
  Watchlists (2026-11-16, a sync brings them unless the popup's "Bring watchlists along" is off):
  Crunchyroll content/v2/discover/<account>/watchlist (series ids), Prime GET /mystuff/watchlist/all/ as JSON plus
  POST /api/paginateCollection (form: the page's fixed scheme fields + the container's token/target/startIndex).
  Netflix My List not yet: /browse/my-list is My Netflix with carousels (13 at first, the rest through a persisted
  GraphQL query), ids only in React props (`Video:<id>` two levels above `standard-card`), find a sturdier source.
  Sync only adds to the watchlist, never removes (decided 2026-11-16): Lateshow's list is yours, the sites feed it.
  Something you removed here comes back while it's still on the site's list (or switch watchlists off).
  Profiles: only yours marks (Netflix userInfo name, Crunchyroll /accounts/v1/me/multiprofile `is_selected`, Prime
  page data `activeProfile.name`), the first that finishes something is yours, the popup changes it.
  Netflix and Prime need Widevine: Zen and Helium have none, so marking those two works only in Chrome.
  Signed for keeps (Firefox): unlisted at addons.mozilla.org (source code: Yes, the source zip).
  Raise "version" in manifest.template.json before each upload.
  Since 2026-11-15 CI does it (job `extension` in ci.yml): a version not yet in public/extension/updates.json gets
  signed at AMO (`web-ext sign`, unlisted, with the source zip, secrets AMO_JWT_ISSUER/AMO_JWT_SECRET), CI commits
  public/extension/lateshow-<version>.xpi + updates.json and redeploys, Zen updates itself via the manifest's
  update_url. So a release = raise the version, push. Pull after it, CI commits to main. `pnpm ext:zip` also makes
  extension/lateshow-extension-source.zip (git archive of HEAD, so commit first, build steps in extension/SOURCE.md):
  AMO asks for source since esbuild bundles, answer Yes and upload it. AMO needs `data_collection_permissions` in the
  gecko settings (what leaves the browser, Firefox 140+ asks on install), keep it true when the extension sends more.
- Private repo github.com/pyvnoaim/lateshow (main). Commit often, push only when the user says so, via push-gate.

## Copy rules (visible text)

- No em dashes, no semicolons.
- Break lines at phrase boundaries, no orphans (`text-wrap: balance` on headings, `pretty` on paragraphs).

## Stack

Next.js 16 App Router (Cache Components, Turbopack), React 19, TS strict, Tailwind v4 (tokens only), Radix, lucide-react,
SQLite + Drizzle, Better Auth (email code + passkeys), zod, Vitest, Prettier, Playwright screenshots.
Hosting: Docker on the VPS behind Nginx Proxy Manager + Cloudflare, SSE for rooms.

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
src/components/  shared UI, ui/ = kit (Container, Section, PosterGrid, SegmentedTabs, ProgressBar, buttonStyles, field, Select = every dropdown)
src/lib/         tmdb, justwatch, env, region, auth, db/, library/ (watched + watchlist: queries, actions, progress)
```

Lint-enforced: no default exports outside route files, no `../` imports, `app/` can't import `lib/tmdb|justwatch|db`,
features can't import each other, `components/` and `lib/` can't import features, no arbitrary Tailwind `[values]`.
Also: data access is `server-only`, only `lib/env.ts` reads `process.env` (plus `lib/build.ts`, the build id inlined at build), writes are zod-validated server actions,
pure logic extracted with a `*.test.ts` beside it, no barrel files, move code to `components/` only when a 2nd feature needs it.

## Styling

- Every value is a token in `src/app/globals.css` (`@theme`), named by role. Missing one? Add a token.
  Names must not collide across namespaces (`--spacing-page` broke `max-w-page`).
- Global CSS only in `@layer base` or `@utility`, never unlayered selectors.
- Glass family: `glass` (clear), `glass-tint` (primary), `glass-accent` (on state), `glass-cell` (small tiles), `glass-hover`
  (quiet links). Pointer sheen via `GlassSheen`. Write only standard `backdrop-filter`.
  Never animate `filter` (blur) on glass or on a parent of glass: it smears the backdrop behind it. Fade and move instead.
- Motion utilities: `press` (buttons), `lift` (cards in a `group`), `sk` (skeleton shimmer), `rise`, `stagger`.
- Intro (`Intro.tsx`, chosen 2026-11-13): black, the logo's light rises, the black lifts. Once per tab (inline script sets
  `data-intro="off"` before paint), Reload on the update bar fades back into it. Page switch: `(main)/template.tsx` (remounts per
  route, a pathname hook there breaks the build), old page out fast, new one rises in. Layout of `.intro` lives in its CSS rule, not utilities (they beat the hide rule).
- Tooltips: never `title`. Use `data-tip` (+ `data-tip-meta`, `data-tip-key` for a shortcut), one global `Tooltips`. Icon-only buttons always get one.

## Design

- Apple TV style: near-black, Inter Tight, tight headlines, no borders or cards, posters carry the color, accent Frost icy
  (#b4c8ea, primary #eef1f6). Logo = `src/app/icon.svg` (dark glass screen, icy light rising),
  used by `Logo`, apple-icon.png rendered from it.
- Premium comes from states, glass, motion and type, never decoration motifs.
- Switchers are plain text (active white, rest grey). Posters stay clean at rest: with a mouse their actions (list, +)
  show as small glass buttons in the poster's corner on hover (`PosterActions` overlay, chosen 2026-11-13), on touch
  screens they sit at the end of the caption line.
- Top bar scrolls away (absolute) and fades up with the scroll (`bar-out`, scroll-driven) while a compact glass island rises in at the top (`NavIsland`, chosen
  2026-11-11 over a fixed bar). Inputs are glass pills like search.
- Rejected, don't bring back: white pill switchers, a dock nav at the bottom, a full-width frosted bar fixed on scroll, poster glow, cinema motifs,
  serif accents, play button on posters, moving hover arrows.
- Every poster caption is the same everywhere (`PosterCaption`): Type · Year · Genre + small service icon.
- Every page: press feel, shaped skeletons (no spinners for loading; rooms' small braille Spinner means waiting on people, not loading), reserved image space + blur-up, optimistic toggles, tabular nums,
  visible focus ring, empty states with one action, Esc closes overlays, `/` opens search.
- Screenshot desktop and phone after every UI change before calling it done.
- Drafts canvases: none open. The extension install, popup and Settings drafts (2026-11-15) are built and their canvases deleted.

## Built

Top bar (search with live results, Up next pill with your show in progress, account, phone menu), footer, home (hero
carousel, rows: new episodes, Can't decide?, watchlist, Top 10, trending, because you watched, new on streaming, cinemas, hidden gems),
/cinemas calendar, /watchlist (shelves: Watch now with leaving dates from JustWatch, Coming up, On other services,
Not streaming here; type/genre/sort in the URL, Add a title, Pick one; a + on every poster caption (cinema posters
too), Out this week from your list on Home), /search (type + genre filters in the URL, browse a genre without a query), title page (where to watch, trailer, episodes + ratings grid, cast, more like), sign in with `?next=`,
profile /u/username (avatar, phone menu and invite page link there, /u/me forwards to it, the footer keeps /u/me since it never looks up who is signed in; stats, heatmap (this year by default, a year switcher once there are watches before this year, only years with watches, click a day: a glass card at the square (`DayPeek`, server action, every title, scrolls inside on busy days)), history (a binge on one day is one row, Show older pages through all of it), watchlist), /settings (your services: My services tab on Trending,
picks only from them, your service first in captions and Watch on, language for TMDB data in a cookie, else the browser's, name, share-with-friends switch, CSV export at /api/export,
delete account. Account rows share one look (2026-11-15, `ListBox`/`ListRow`/`Invite`): Passkeys (rename, remove,
Add as the last row, an invitation when none), Extension (Add to Zen / Connect this browser / connected browsers,
"this browser" from the extension's page marks), Import (titles waiting for a pick as a bar, one line per service
with total, last import and Sync through the extension, opening into a timeline of its runs with posters and Remove,
Import a file below; unclear titles are kept in `import_batch.open` until picked or skipped). Spoiler guard and the .ics calendar feed were removed 2026-11-13),
watch dates (marked by hand = today, the title page then offers "A while ago" = no date, off heatmap and Recently watched, History "Earlier", or a picked day, `redateTitle`), remembered matches (`title_link`, per user: a site id like prime:amzn1.dv.gti… to a TMDB title, from clear matches and your picks, the next import skips the search), imports you can remove (`import_batch`, `import_id` on watched/watchlist/rating, Settings › Import lists them, Remove takes back only what that run added, your own re-rating keeps a rating), ratings (not for me / like / love, `rating` table, on the title page once watched, feed "Because you loved", taste match
and imports), OG images per title and profile (profile shows only the name, profiles are friends only), PWA manifest,
lists (/l/<id>, see Todo), update bar after a deploy (`UpdateBar`: build id from next.config vs `/api/version`, on tab focus and every 10 min), /watchlist + /u/me redirects in `next.config.ts`, 404, errors, /about.

## Todo (in order)

- [x] Hosting (2026-11-11): Portainer stack `lateshow` from this repo, NPM host lateshow.pyvno.xyz (custom `*.pyvno.xyz`
      cert, like quorum), Cloudflare A record proxied, CI webhook deploys. Resend: pyvno.xyz verified (eu-west-1,
      return path `send`, tracking off), `RESEND_API_KEY` + `MAIL_FROM` in Portainer.
- [x] Privacy/impressum filled and checked against the server (2026-11-11). Impressum name is still the nickname. Backups skipped for now (decided 2026-11-11), Litestream to R2 when it matters.
      /privacy and /impressum exist (2026-11-11): fill the placeholders in `src/lib/legal.ts` and the email provider
      line on /privacy. Keep /privacy true to the code: no browser request may go to TMDB/JustWatch (images go
      through next/image), cookies listed there are the only ones.
- [x] Import (2026-11-11): Settings › Import takes a Letterboxd export ZIP, IMDb ratings/watchlist CSVs or Prime Video (the CSV of the community "Watch History Exporter for Amazon Prime Video" console script, 2026-11-15: seasons and episode numbers from its titles, placed by name then number). The browser
      unpacks and reads them (fflate), only rows go to the server in batches of 40 (`lib/library/importActions.ts`),
      IMDb matches by id, Letterboxd by title + year (±1) across films and series (a watched series = every aired episode), unclear ones are picked by hand. Ratings come along (9+ love, 6+ like, 4 or less not for me). Netflix viewing history CSV (2026-11-14): episodes placed by name per season (brackets ignored),
      each with its day, remakes decided by which show's episodes fit, yearless films = top hit released by the watch day.
      Import screen (`ImportProgress`, chosen 2026-11-14, drafts on https://claude.ai/artifact/LxPuaPpsbjm7vRJehUkRmX): dark screen,
      a bar per month lit oldest first (rows go oldest first), icy glow under the current month, the title rises in. The result counts up.
- [x] Lists (2026-11-12): `list` + `list_item`, the 16 char id is the link. Owner picks Only you / Friends / Anyone
      with the link (signed out too), access in `canSeeList`. Add from the list icon on the title page and in every poster caption (once you have a list), Lists tab on
      profiles, /l/<id> (rename, copy link, delete, Remove under posters), "Pick one together" = a swipe room over the
      list (`room.list_id`, the kind most titles are). Link preview (OG) only for "Anyone with the link" lists, the rest get a plain card.
- [ ] Chrome Web Store (developer fee paid 2026-11-15, non-trader account): list the extension as Unlisted with
      `pnpm ext:chrome` (extension/lateshow-chrome.zip, no Firefox keys). Ready (2026-11-16): text, permission
      justifications and data answers in extension/store/STORE.md, images there, /privacy has the extension section,
      activeTab dropped (unused). Submitted for review 2026-11-16 as 0.7.2, Unlisted, item id
      olpjkleefegccejonlngdnnphnapcbfj (chromewebstore.google.com/detail/olpjkleefegccejonlngdnnphnapcbfj once approved).
      Left: automate uploads in CI (Web Store API, OAuth
      client + refresh token as secrets) like AMO. Then Settings › Extension gets "Add to Chrome".
- [ ] Later: genre/mood row, imports from TMDB account and Trakt (both have ids).
- [ ] Watch together = a browser extension (drafts on the canvas, approved 2026-11-11): syncs the streaming site's
      player for everyone in a room, on a laptop. Rejected: a manual 3-2-1 countdown flow without the extension.
      Plan, v1 = Netflix + Chrome (MV3): 1 room gets a playback state (playing/paused, position, at) on the existing
      live updates · 2 extension popup (room, who's watching, in sync) using the Lateshow sign-in of that browser ·
      3 content script: one generic adapter (the largest `<video>`, searched through shadow roots and frames) plus small
      per-site fixes. Sites (decided 2026-11-11): Netflix (seek only through its own player API, a raw currentTime seek
      errors), Prime Video (Paramount+ plays inside it as a channel, skip trailer/ad videos), Apple TV+ and Disney+
      (player in shadow DOM), Crunchyroll (player is a cross-origin iframe on static.crunchyroll.com, `all_frames`),
      YouTube (`#movie_player` API, pause sync while `.ad-showing` so non-Premium ads don't drag everyone) ·
      4 drift fix past ~2 s ("You're 4 s behind", Catch up / Wait for me) · 5 test with friends as "load unpacked".
      Everyone needs their own subscription, nothing is streamed between people. Later: Chrome Web Store ($5 once)
      or Firefox add-ons (free).
      Extension step 0, before sync (decided 2026-11-15): a history importer. On the site's watch history, signed in
      there, it reads the site's own data and sends rows straight to Lateshow's import (no CSV), one row shape for every
      site (title, season, episode, day). It also sets up the extension's Lateshow sign-in that sync needs.
      Prime Video first: port the community exporter (Unlicense, public domain, reviewed 2026-11-15), read the page's
      data (ids, real season and episode numbers) instead of display text. Then Crunchyroll (no export of its own, its
      site calls a watch history API with series, season, episode), then Netflix (done 2026-11-15, reads its API, still name-only
      episodes). Disney+ and Apple TV+ show no history, nothing to read.
      Chrome and Firefox (Zen) from day one (decided 2026-11-15): one codebase, one MV3 manifest listing both
      `background.service_worker` and `background.scripts`, `chrome.*` APIs, a fixed gecko id, a "Allow access to this
      site" step (Firefox grants hosts per user). Test in Firefox first. Firefox keeps it as an unlisted signed add-on
      (free), Chrome as load unpacked. Netflix plays in lower quality in Firefox, only matters for sync.
      Build order (brainstorm 2026-11-15, all approved):
      1 importers above, with a preview in the popup (counts, unclear ones picked there) before anything is written ·
      2 every import is a batch you can undo ("Remove the 1,192 watches from the Prime import") ·
      3 delta imports: the last imported watch per site is remembered, Sync now only pulls newer ones ·
      4 remembered ids: a confirmed match stores the site's id (Amazon gti, Netflix id, Crunchyroll series) so the
      next import and auto-marking skip the search. Anime: air date and absolute number help place episodes ·
      5 auto-marking: an episode past ~90% on Netflix, Prime or Crunchyroll is marked with its real time, a toast
      "Marked The Boys S1E5 · Undo", a switch per site. Shares the player detection with sync.
      Decided: the extension gets its own key when you connect (hashed,
      can only mark, Disconnect in Settings), not the login cookie (Firefox isolates cookies per site) · only your
      Prime profile is marked · real watched seconds count (seeking doesn't, ads pause it), credits = the site's Skip
      Credits / Next episode overlay, else ~90%, and at least half actually watched · marks queue in the extension
      and retry with their real time, the server ignores doubles, Undo removes only what that mark created · one
      generic `<video>` progress module, each site adds only "what's playing" and its credits signal · only the
      finished title leaves the browser, never progress (say so on /privacy) · a `via` column ("Prime Video") on
      watched for History ·
      6 watch together sync (above), plus: an intro skip skips for everyone, Prime ad breaks pause the sync like
      YouTube's, "Wait for me" and everyone resumes together ·
      7 Lateshow on the sites, optional and small: a Watched check on their posters, your rating, friends who
      watched and + Watchlist on their title pages. Most fragile, so last.
      Robustness throughout: each site's reader is its own module with a saved snapshot of the site's data as a test
      fixture (a site change fails a test, not your import), and the popup says "The Prime reader needs an update"
      instead of failing quietly.
- [ ] Friends (decided 2026-11-11): mutual, by invite link only (7 days, few uses), no people search.
      Friends see everything by default, one Settings switch hides it. Tables: `user.username`, `friendship`
      (one row per pair, lower id first), `invite`. Access checked in one helper. Build order:
      1 username + `/u/[username]` (done) · 2 invite + accept (done) · 3 Friends tab + friends' profiles + remove + privacy switch (done) ·
      4 "Friends this week" row + friends on title pages (done) · 5 taste match % (shown from 10 titles each) (done). All five steps done 2026-11-11.
- [x] Rooms (drafts on the canvas, 2026-11-11). Tables `room` (4 letter code, 12 h, `version` for live updates) and
      `room_member` (user id or `guest:<cookie id>`, `joined` false = invited friend). Live via SSE that polls the
      version (`/api/rooms/[code]/events`). Phone QR = Better Auth one-time token (2 min, once), opens `/handoff` which asks "Continue as @name?" first. Guest member ids are a hash of the cookie secret.
      1 room + lobby + guests + invites + QR (done) · 2 swipe (titles on everyone's shared services, first all-yes wins) (done) ·
      3 bracket 8 > 4 > 2 > 1 (done, `bracketState` derives it all from `room_pick`) · 4 reel (moods, server picks the winner, 3 picks) (done, `parseMood` maps words to genres/length/era, unknown words go to TMDB keyword search). Rooms done 2026-11-11.
