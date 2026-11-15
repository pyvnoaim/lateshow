// Builds the extension into extension/dist (load that folder in Chrome or Firefox).
// `node extension/build.mjs` for Lateshow in production, `--dev` for http://localhost:3000.
import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const out = `${dir}dist/`;
const lateshow = process.argv.includes("--dev") ? "http://localhost:3000" : "https://lateshow.pyvno.xyz";

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["popup", "prime", "lateshow"].map((f) => `${dir}src/${f}.ts`),
  outdir: out,
  bundle: true,
  format: "iife",
  target: ["chrome120", "firefox121"],
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  define: { __LATESHOW__: JSON.stringify(lateshow) },
  logLevel: "warning",
});
const manifest = (await readFile(`${dir}manifest.json`, "utf8")).replaceAll("__LATESHOW__", lateshow);
await writeFile(`${out}manifest.json`, manifest);
await copyFile(`${dir}popup.html`, `${out}popup.html`);
await copyFile(fileURLToPath(new URL("../src/app/apple-icon.png", import.meta.url)), `${out}icon.png`);
console.log(`Built extension/dist for ${lateshow}`);
