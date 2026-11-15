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
- **Browser extension** (Zen, Firefox, Chrome) brings your history from Netflix, Prime Video and Crunchyroll
  with one click and marks every episode you finish there

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

The extension lives in `extension/`: `pnpm ext:dev` builds it against localhost into `extension/dist`
(load it unpacked). New versions for Zen and Firefox: raise the version in `extension/manifest.template.json`
and push, CI has Mozilla sign it and publishes it on the site.

## Deploy

Runs as a Portainer stack on the VPS (Stacks > Add stack > Repository, compose path `docker-compose.yml`,
environment variables as in `.env.example`). Every push to main runs the checks, then calls the stack's
webhook so Portainer pulls and rebuilds. The database lives in a Docker volume and migrations run on start.

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
