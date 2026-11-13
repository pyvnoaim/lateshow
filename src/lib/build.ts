/**
 * The build this code came from, one id per deploy (next.config inlines it into server and client code at build).
 * The one process.env read outside lib/env.ts: a constant baked in at build, not runtime config.
 */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
