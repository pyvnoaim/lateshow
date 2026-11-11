import "server-only";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { isBuildPhase } from "@/lib/env";
import { db } from "./client";

/**
 * Applies pending SQL migrations from drizzle/ (relative to the working directory). Safe on every start.
 * Skipped during `next build`, so building never creates or touches a database.
 */
export function migrateOnStart() {
  if (isBuildPhase) return;
  migrate(db, { migrationsFolder: "drizzle" });
}
