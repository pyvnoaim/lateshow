<p align="center">
  <img src="src/app/icon.svg" width="72" alt="" />
</p>

<h1 align="center">Lateshow</h1>

<p align="center">
  Find what to watch, see where it streams, keep track of what you watched.<br />
  No ads, no tracking, no paid features.
</p>

## What it does

- **Discover** trending titles, the Top 10 in your country and picks based on your taste
- **Where to watch** with direct links to your streaming services
- **Track** your watchlist, history and progress through series
- **Friends** see what each other watched, invite only
- **Rooms** to pick a movie together by swiping, a bracket or a reel

## Run it

Needs Node 22+ and pnpm.

```sh
pnpm install
cp .env.example .env.local   # add TMDB_TOKEN and BETTER_AUTH_SECRET
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The database sets itself up on first start
and the sign-in code shows up in the terminal.

Run `pnpm check` before every commit (format, types, lint, tests). CI runs it too.

## Deploy

```sh
docker compose pull && docker compose up -d   # needs a .env next to docker-compose.yml
```

Every push to main builds `ghcr.io/pyvnoaim/lateshow`. The database lives in a Docker volume,
migrations run on start and `/api/health` reports if it is up.

## Built with

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · SQLite + Drizzle · Better Auth

## Layout

```
src/app          routes
src/features     product areas (discover, titles, watchlist, rooms, ...)
src/components   shared UI
src/lib          data, auth, database
```

Conventions and design rules live in [`CLAUDE.md`](CLAUDE.md).

---

<sub>Data from [TMDB](https://www.themoviedb.org) and JustWatch. This product uses the TMDB API but is not endorsed or
certified by TMDB.</sub>
