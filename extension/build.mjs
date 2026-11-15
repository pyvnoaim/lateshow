// Builds the extension into extension/dist (load that folder in Chrome or Firefox).
// `node extension/build.mjs` for Lateshow in production, `--dev` for http://localhost:3000.
import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const out = `${dir}dist/`;
const lateshow = process.argv.includes("--dev") ? "http://localhost:3000" : "https://lateshow.pyvno.xyz";
// site patterns can't hold a port (Firefox matches none with one), without one they cover every port
const match = lateshow.replace(/:\d+$/, "");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: [
    "popup",
    "prime",
    "prime-main",
    "crunchyroll",
    "crunchyroll-main",
    "frame-video",
    "netflix",
    "netflix-main",
    "lateshow",
    "background",
  ].map((f) => `${dir}src/${f}.ts`),
  outdir: out,
  bundle: true,
  format: "iife",
  target: ["chrome120", "firefox121"],
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  define: {
    __LATESHOW__: JSON.stringify(lateshow),
    __LATESHOW_MATCH__: JSON.stringify(match),
    // a test build marks after a few seconds of real watching (still only past 90%), never for release
    __MARK_SHARE__: process.argv.includes("--test") ? "0.02" : "0.5",
  },
  loader: { ".svg": "text" }, // the logo, inlined into the card
  logLevel: "warning",
});
const manifest = (await readFile(`${dir}manifest.template.json`, "utf8")).replaceAll("__LATESHOW__", match);
await writeFile(`${out}manifest.json`, manifest);
await copyFile(`${dir}popup.html`, `${out}popup.html`);
// icon.png: src/app/icon.svg rendered once at 128 px with a transparent background (apple-icon.png is opaque, iOS)
await copyFile(`${dir}icon.png`, `${out}icon-128.png`); // a new name: Firefox kept showing the old icon.png
console.log(
  `Built extension/dist for ${lateshow}${process.argv.includes("--test") ? " (TEST: marks after 2% watched)" : ""}`,
);
