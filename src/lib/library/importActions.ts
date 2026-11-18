"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { importBatch as imports, rating, rewatch, watched, watchlist } from "@/lib/db/schema";
import type { ImportRow, ImportSource } from "./importing";
import { keepOpen, openKey, ownBatch, runBatch, save, startImportFor } from "./importRun";
import { pick, remember, row, type BatchResult, type Match } from "./matching";

export type { BatchResult, Candidate, Saved, Unsure } from "./matching";

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Sign in to import.");
  return session.user.id;
}

/** Starts an import run: everything it adds carries this id, so Settings can remove it again as a whole. */
export async function startImport(source: ImportSource): Promise<string> {
  return startImportFor(await requireUserId(), source);
}

/** One batch of rows from an export: matched ones are saved, unclear ones come back with candidates. */
export async function importBatch(raw: ImportRow[], rawImportId: string): Promise<BatchResult> {
  const result = await runBatch(await requireUserId(), raw, rawImportId);
  refresh();
  return result;
}

/** You picked which title an unclear row meant. */
export async function importPick(rawRow: ImportRow, rawPick: z.input<typeof pick>, rawImportId: string) {
  const userId = await requireUserId();
  const importId = await ownBatch(userId, rawImportId);
  const r = row.parse(rawRow);
  const p = pick.parse(rawPick);
  const picked: Match = { row: r, id: p.id, type: p.type, title: p.title, posterPath: p.posterPath };
  const saved = await save(userId, [picked], importId);
  remember(userId, [picked]); // your pick: the next import knows this title
  await keepOpen(importId, (open) => open.filter((u) => openKey(u.row) !== openKey(r)));
  refresh();
  return saved;
}

/** You skipped an unclear row: it stops waiting. */
export async function importSkip(rawRow: ImportRow, rawImportId: string) {
  const userId = await requireUserId();
  const importId = await ownBatch(userId, rawImportId);
  const r = row.parse(rawRow);
  await keepOpen(importId, (open) => open.filter((u) => openKey(u.row) !== openKey(r)));
  refresh();
}

/**
 * Settings › Import › Remove: takes back what one import added (watches, watchlist entries, ratings you haven't
 * changed since). What was there before it, or what you marked yourself, stays.
 * ponytail: titles the import took off your watchlist (watched beats watchlist) don't come back.
 */
export async function removeImport(rawId: string) {
  const userId = await requireUserId();
  const id = await ownBatch(userId, rawId);
  db.transaction((tx) => {
    tx.delete(watched)
      .where(and(eq(watched.userId, userId), eq(watched.importId, id)))
      .run();
    tx.delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.importId, id)))
      .run();
    tx.delete(rating)
      .where(and(eq(rating.userId, userId), eq(rating.importId, id)))
      .run();
    tx.delete(rewatch)
      .where(and(eq(rewatch.userId, userId), eq(rewatch.importId, id)))
      .run();
    tx.delete(imports).where(eq(imports.id, id)).run();
  });
  refresh();
}
