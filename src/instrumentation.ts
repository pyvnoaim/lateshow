// Runs once when the server starts, before it takes requests: the database is always on the latest schema.
export async function register() {
  // The literal process.env check (not via lib/env) is what lets the bundler drop the database from the edge build.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateOnStart } = await import("@/lib/db/migrate");
    migrateOnStart();
  }
}
