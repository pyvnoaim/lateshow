import "server-only";
import { z } from "zod";
import type { ImportRow } from "@/lib/library/importing";
import { runBatch, startImportFor } from "@/lib/library/importRun";

// what the extension reads by itself (Sync in its popup)
const body = z.object({
  source: z.enum(["Netflix", "Prime Video", "Crunchyroll"]),
  // the run this batch belongs to, none for the first batch of a sync (it starts one)
  importId: z.string().min(8).max(40).optional(),
  rows: z.array(z.unknown()).max(200),
});

/**
 * One batch of a sync from the extension's popup, as the key's user: the same import Settings runs (matching, nothing
 * twice, every run removable), unclear titles wait in Settings. Answers counts, never the candidates.
 */
export async function syncFromExtension(userId: string, raw: unknown) {
  const b = body.parse(raw);
  const importId = b.importId ?? (await startImportFor(userId, b.source));
  // runBatch checks the run is this user's and every row
  const r = await runBatch(userId, b.rows as ImportRow[], importId);
  return {
    importId,
    films: r.films,
    series: r.series,
    episodes: r.episodes,
    watchlist: r.watchlist,
    notFound: r.notFound,
    unsure: r.unsure.length,
  };
}
