import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/lib/env";
import * as authSchema from "./auth-schema";

function open() {
  const file = env("db").DATABASE_PATH;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema: { ...authSchema } });
}

// One connection per process. Dev hot reload would otherwise open a new one on every edit.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof open> };
export const db = (globalForDb.db ??= open());
