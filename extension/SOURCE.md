# Lateshow extension: building it from this source

This builds an exact copy of the submitted add-on.

## Environment

- Any OS with Node.js and pnpm (built on macOS 27, also works on Linux and Windows)
- Node.js 22 or later (built with 22.23.4): https://nodejs.org
- pnpm 11 (built with 11.3.0). It comes with Node through Corepack: `corepack enable`
  (or install it: `npm install -g pnpm@11.3.0`)

## Build

```sh
pnpm install --frozen-lockfile
node extension/build.mjs
```

The add-on is then in `extension/dist`, the same files as the submitted zip.

## What is what

- `extension/src`: the add-on's own code (TypeScript)
- `extension/build.mjs`: the build script. It bundles each entry with esbuild (no minifying), writes
  `manifest.json` from `manifest.template.json` and copies `popup.html` and the icon
- `src/lib/library/importing.ts` and `src/lib/watchProgress.ts`: code shared with the Lateshow website
- `src/app/icon.svg`: the logo, drawn inline into the add-on's card
- The `-main.ts` files run in the site's own page (MAIN world) and only read what that page already holds
