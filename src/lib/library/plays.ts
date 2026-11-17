import { eq, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/sqlite-core";
import { rewatch, watched } from "@/lib/db/schema";

const qb = new QueryBuilder();
const cols = {
  userId: watched.userId,
  mediaType: watched.mediaType,
  tmdbId: watched.tmdbId,
  season: watched.season,
  episode: watched.episode,
  title: watched.title,
  posterPath: watched.posterPath,
  minutes: watched.minutes,
};

/**
 * Every viewing, one row each: the first watch plus each rewatch, for whatever reads by date (history, heatmap, watch
 * time, recently watched, friends). A subquery, not a SQL view: a view would break drizzle's table rebuilds. A
 * rewatch's id is negative so the two never collide (Undo tells them apart by it).
 * ponytail: ORDER BY over the union sorts all of a user's viewings instead of reading the index in order. Milliseconds
 * for thousands of rows, a merged read of both indexes if it ever isn't.
 */
export const plays = qb
  .select({
    id: watched.id,
    ...cols,
    watchedAt: watched.watchedAt,
    via: watched.via,
    rewatch: sql<boolean>`0`.mapWith(Boolean).as("rewatch"),
  })
  .from(watched)
  .unionAll(
    qb
      .select({
        id: sql<number>`-${rewatch.id}`.as("id"),
        ...cols,
        watchedAt: rewatch.watchedAt,
        via: rewatch.via,
        rewatch: sql<boolean>`1`.mapWith(Boolean).as("rewatch"),
      })
      .from(rewatch)
      .innerJoin(watched, eq(watched.id, rewatch.watchedId)),
  )
  .as("plays");
