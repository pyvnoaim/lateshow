# Lateshow

Find what to watch, see where it streams, and keep track of what you watched.
Movies and series, for you and your friends.

A personal, non-commercial project. No ads, no tracking, no paid features.

## Features

- **Home**: a hero carousel plus rows for new episodes of your shows, the Top 10 in your country, trending titles,
  new on streaming, in cinemas, hidden gems and picks based on what you watched.
- **Where to watch**: direct links to the services a title streams on, in your country, with yours listed first.
- **Title pages**: trailer, cast, episodes with a ratings grid, similar titles and which friends watched it.
- **Watchlist**: grouped into Watch now (with leaving dates), Coming up, On other services and Not streaming here.
- **Profile**: watch history, stats, a heatmap and your watchlist, plus a CSV export.
- **Friends**: mutual, by invite link only. Friends this week on Home and a taste match.
- **Rooms**: pick something together, in person or remote. Swipe, bracket or reel, guests join with just a name.
- **Sign in**: a 6 digit email code or a passkey. No passwords.

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Radix ·
SQLite with Drizzle · Better Auth · zod · Vitest · Prettier · ESLint

## Getting started

Requires Node 22+ and pnpm 11.

```sh
pnpm install
cp .env.example .env.local   # then fill in TMDB_TOKEN and BETTER_AUTH_SECRET
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. In development the sign-in code is printed in the terminal instead of emailed.

### Environment

| Variable                     | Needed     | What it is                                                               |
| ---------------------------- | ---------- | ------------------------------------------------------------------------ |
| `TMDB_TOKEN`                 | always     | TMDB API Read Access Token, from https://www.themoviedb.org/settings/api |
| `BETTER_AUTH_SECRET`         | always     | Random secret, `openssl rand -base64 32`                                 |
| `BETTER_AUTH_URL`            | always     | Public URL of the app, `http://localhost:3000` locally                   |
| `DATABASE_PATH`              | optional   | SQLite file, defaults to `data/lateshow.db`                              |
| `RESEND_API_KEY`             | production | Sends the sign-in emails through [Resend](https://resend.com)            |
| `MAIL_FROM`, `MAIL_REPLY_TO` | production | Sender and reply address for those emails                                |

## Scripts

| Command            | Does                                                             |
| ------------------ | ---------------------------------------------------------------- |
| `pnpm dev`         | Dev server                                                       |
| `pnpm build`       | Production build                                                 |
| `pnpm start`       | Serve the production build                                       |
| `pnpm check`       | Prettier, typecheck, ESLint and tests. Must pass before a commit |
| `pnpm test`        | Tests only (Vitest)                                              |
| `pnpm db:generate` | Create a migration from `src/lib/db/schema.ts`                   |
| `pnpm db:migrate`  | Apply migrations to the local database                           |

## Project structure

```
src/
  app/          Routes only. Read params, call a feature, render
  features/     Product areas with their own UI and logic (discover, titles, watchlist, rooms, ...)
  components/   Shared UI. ui/ is the kit (Container, PosterGrid, buttons, fields)
  lib/          Data and logic: TMDB, JustWatch, auth, database, region, library
drizzle/        SQL migrations
public/         Static files
```

The boundaries are enforced by ESLint: `app/` can't reach the database or APIs directly, features don't import each
other, and `components/` and `lib/` don't import features. Writes are zod-validated server actions, data access is
server only, and pure logic has a `*.test.ts` next to it. `CLAUDE.md` has the full conventions and design rules.

## Data and privacy

- Title data and images come from [TMDB](https://www.themoviedb.org). Images go through the app's own image server,
  so a visitor's browser never talks to TMDB.
- Streaming links and the Top 10 come from JustWatch's unofficial API. If it fails, those parts are hidden.
- The country is read from the request (Cloudflare or Vercel header, default DE) and never stored.
- No analytics and no tracking cookies, so no cookie banner.

This product uses the TMDB API but is not endorsed or certified by TMDB.
