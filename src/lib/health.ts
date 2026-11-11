import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/** True when the database answers. Used by /api/health for Docker and uptime checks. */
export function dbIsUp() {
  try {
    db.get(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
