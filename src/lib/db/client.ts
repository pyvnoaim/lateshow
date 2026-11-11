import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env, isBuildPhase } from "@/lib/env";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

function open() {
  // `next build` loads every route in parallel workers. They must not share a file: all switching it to WAL at once
  // failed a deploy with SQLITE_BUSY (2026-11-11). A build never needs real data, so it gets a throwaway in-memory db.
  const file = isBuildPhase ? ":memory:" : env("db").DATABASE_PATH;
  if (!isBuildPhase) fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema: { ...authSchema, ...appSchema } });
}

// One connection per process. Dev hot reload would otherwise open a new one on every edit.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof open> };
export const db = (globalForDb.db ??= open());
