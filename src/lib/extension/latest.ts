import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Updates = { addons?: Record<string, { updates?: { version?: string; update_link?: string }[] }> };

/**
 * The newest signed extension for Firefox and Zen (CI publishes it in public/extension), null before the first one.
 * Settings › Extension links its "Add" button there.
 */
export async function latestExtension(): Promise<{ version: string; link: string } | null> {
  try {
    const file = path.join(process.cwd(), "public/extension/updates.json");
    const json = JSON.parse(await readFile(file, "utf8")) as Updates;
    const last = Object.values(json.addons ?? {})[0]?.updates?.at(-1);
    if (!last?.version || !last.update_link) return null;
    // served from public/: the link's path works on any host (localhost too)
    return { version: last.version, link: new URL(last.update_link).pathname };
  } catch {
    return null;
  }
}
