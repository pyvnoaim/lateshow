import "server-only";
import { z } from "zod";

const TMDB_MISSING = 'TMDB "API Read Access Token" missing. Put it in .env.local, see .env.example';

const schema = z.object({
  TMDB_TOKEN: z.string({ error: TMDB_MISSING }).min(1, TMDB_MISSING),
});

let cached: z.infer<typeof schema> | undefined;

/**
 * The only place that reads process.env. Validated on first use and cached.
 * ponytail: lazy instead of at boot so pages without TMDB (about, sign in) still run during setup.
 */
export function env() {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  cached = result.data;
  return cached;
}
