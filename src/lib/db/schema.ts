import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

/**
 * One row per watched movie or episode. Movies use season 0 / episode 0.
 * Title, poster and runtime are stored with the row so history and stats never need TMDB.
 */
export const watched = sqliteTable(
  "watched",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    season: integer("season").notNull().default(0),
    episode: integer("episode").notNull().default(0),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    minutes: integer("minutes").notNull().default(0),
    // null: watched some time ago, date unknown (marked by hand as "A while ago")
    watchedAt: integer("watched_at", { mode: "timestamp_ms" }).default(now),
    /** the import that added it (import_batch.id), null when you marked it yourself: Remove undoes only those */
    importId: text("import_id"),
  },
  (t) => [
    uniqueIndex("watched_once").on(t.userId, t.mediaType, t.tmdbId, t.season, t.episode),
    index("watched_by_time").on(t.userId, t.watchedAt),
    index("watched_by_import").on(t.importId),
  ],
);

/**
 * Your matches from a site's own id to a TMDB title ("prime:amzn1.dv.gti…" to a series), from imports and your picks,
 * so the next import of that title skips the search. Per user: nobody's pick decides for anyone else.
 */
export const titleLink = sqliteTable(
  "title_link",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.ref] })],
);

/** One run of Settings › Import (a file or the extension), so it can be removed again as a whole. */
export const importBatch = sqliteTable(
  "import_batch",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** "Prime Video", "Letterboxd", "IMDb", "Netflix" */
    source: text("source").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("import_batch_by_user").on(t.userId)],
);

export const watchlist = sqliteTable(
  "watchlist",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    addedAt: integer("added_at", { mode: "timestamp_ms" }).default(now).notNull(),
    importId: text("import_id"), // the import that added it, see watched.importId
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaType, t.tmdbId] })],
);

/** Streaming services a user pays for (TMDB provider ids). Powers "My services" and picks. */
export const userServices = sqliteTable(
  "user_services",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: integer("provider_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.providerId] })],
);

/** Two users who are friends. One row per pair, the smaller user id in `a`, so a pair can't be stored twice. */
export const friendship = sqliteTable(
  "friendship",
  {
    a: text("a")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    b: text("b")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [primaryKey({ columns: [t.a, t.b] }), index("friendship_b").on(t.b)],
);

/** An invite link (/invite/<code>). Works until `expiresAt` for `usesLeft` more friends. */
export const invite = sqliteTable(
  "invite",
  {
    code: text("code").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usesLeft: integer("uses_left").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("invite_by_user").on(t.userId)],
);

/**
 * A watch-together room, joined by its 4 letter code. `version` goes up on every change so the live lobby
 * (server-sent events) only refreshes when something happened.
 */
export const room = sqliteTable("room", {
  code: text("code").primaryKey(),
  hostId: text("host_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["movie", "tv"] }).notNull(),
  game: text("game", { enum: ["swipe", "bracket", "reel"] }).notNull(),
  status: text("status", { enum: ["lobby", "playing", "done"] })
    .notNull()
    .default("lobby"),
  version: integer("version").notNull().default(0),
  // set when a game starts: the country and services titles come from, and the shared deck (JSON of TMDB ids)
  country: text("country"),
  services: text("services", { mode: "json" }).$type<number[]>(),
  deck: text("deck", { mode: "json" }).$type<number[]>(),
  // the title everyone picked (swipe: the first one all of you liked)
  winner: integer("winner"),
  // who was in the room when the game started (bracket waits for these, not for late joiners)
  players: text("players", { mode: "json" }).$type<string[]>(),
  // reel: the mood the spin landed on (its 3 picks are in `deck`)
  mood: text("mood"),
  // swipe or bracket over a list's titles instead of discover (no FK: a deleted list just deals an empty deck)
  listId: text("list_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Who is in a room. `memberId` is a user id, or "guest:<random>" for someone who joined by code without an account
 * (that id lives in their browser's cookie). Invited friends have a row with `joined` false until they come in.
 */
export const roomMember = sqliteTable(
  "room_member",
  {
    roomCode: text("room_code")
      .notNull()
      .references(() => room.code, { onDelete: "cascade" }),
    memberId: text("member_id").notNull(),
    name: text("name").notNull(),
    joined: integer("joined", { mode: "boolean" }).notNull().default(true),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomCode, t.memberId] }), index("room_member_by_member").on(t.memberId)],
);

/** One swipe: a member said yes or no to a title in a room's deck. */
export const roomVote = sqliteTable(
  "room_vote",
  {
    roomCode: text("room_code")
      .notNull()
      .references(() => room.code, { onDelete: "cascade" }),
    memberId: text("member_id").notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    like: integer("like", { mode: "boolean" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomCode, t.memberId, t.tmdbId] })],
);

/** A bracket vote: in match `match` (0-6), this member picked `choice` (a TMDB id). */
export const roomPick = sqliteTable(
  "room_pick",
  {
    roomCode: text("room_code")
      .notNull()
      .references(() => room.code, { onDelete: "cascade" }),
    memberId: text("member_id").notNull(),
    match: integer("match").notNull(),
    choice: integer("choice").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomCode, t.memberId, t.match] })],
);

/** Reel: each member's mood for tonight ("Mind-bending", "under 100 min"). One each, the latest counts. */
export const roomMood = sqliteTable(
  "room_mood",
  {
    roomCode: text("room_code")
      .notNull()
      .references(() => room.code, { onDelete: "cascade" }),
    memberId: text("member_id").notNull(),
    name: text("name").notNull(),
    mood: text("mood").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomCode, t.memberId] })],
);

/** Your verdict on a title: -1 not for me, 1 liked it, 2 loved it. No row = not rated. */
export const rating = sqliteTable(
  "rating",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    value: integer("value").notNull(),
    ratedAt: integer("rated_at", { mode: "timestamp_ms" }).default(now).notNull(),
    importId: text("import_id"), // the import that added it, cleared once you rate it yourself
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaType, t.tmdbId] }), index("rating_by_time").on(t.userId, t.ratedAt)],
);

/**
 * A list of titles someone made ("Halloween with friends"). The id is the link, long enough not to be guessed.
 * `visibility`: only the owner, their friends, or anyone with the link (signed out too).
 */
export const list = sqliteTable(
  "list",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    visibility: text("visibility", { enum: ["private", "friends", "link"] })
      .notNull()
      .default("private"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("list_by_user").on(t.userId)],
);

export const listItem = sqliteTable(
  "list_item",
  {
    listId: text("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    addedAt: integer("added_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.mediaType, t.tmdbId] })],
);
