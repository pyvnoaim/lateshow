import "server-only";
import { z } from "zod";

const TMDB_MISSING = 'TMDB "API Read Access Token" missing. Put it in .env.local, see .env.example';
const SECRET_MISSING =
  "BETTER_AUTH_SECRET missing or shorter than 32 characters. Generate one with: openssl rand -base64 32";

/** Grouped by area, so a page that only needs auth still works while the TMDB token isn't set up. */
const schemas = {
  tmdb: z.object({ TMDB_TOKEN: z.string({ error: TMDB_MISSING }).min(1, TMDB_MISSING) }),
  auth: z.object({
    BETTER_AUTH_SECRET: z.string({ error: SECRET_MISSING }).min(32, SECRET_MISSING),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  }),
  db: z.object({ DATABASE_PATH: z.string().min(1).default("data/lateshow.db") }),
  // Sign-in emails through Resend. Only needed in production (dev prints codes in the terminal).
  mail: z.object({
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY missing: sign-in emails need it in production"),
    MAIL_FROM: z.string().min(3).default("Lateshow <login@pyvno.xyz>"),
    MAIL_REPLY_TO: z.email().optional(),
  }),
};

type Area = keyof typeof schemas;
type Env<A extends Area> = z.infer<(typeof schemas)[A]>;
const cache = new Map<Area, unknown>();

/** The only place that reads process.env. Validated on first use per area, then cached. */
export function env<A extends Area>(area: A): Env<A> {
  if (!cache.has(area)) {
    const result = schemas[area].safeParse(process.env);
    if (!result.success) {
      const lines = result.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid environment (${area}):\n${lines.join("\n")}`);
    }
    cache.set(area, result.data);
  }
  return cache.get(area) as Env<A>;
}

export const isProduction = process.env.NODE_ENV === "production";
