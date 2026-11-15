import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { extensionKey } from "@/lib/db/schema";

/**
 * The extension's own key: "ls_<id>_<secret>". The id finds the row, only a hash of the secret is stored and compared
 * in constant time. It can only mark watches (the /api/extension routes), never act as your session.
 */
const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
const FORMAT = /^ls_([\w-]{12})_([\w-]{32})$/;

/** A new key for this user, returned once (the browser keeps it, Lateshow only its hash) */
export async function newKey(userId: string) {
  const id = randomBytes(9).toString("base64url");
  const secret = randomBytes(24).toString("base64url");
  await db.insert(extensionKey).values({ id, userId, hash: hash(secret) });
  return `ls_${id}_${secret}`;
}

/** Whose key this is ("Authorization: Bearer ls_…"), null for a wrong or disconnected one */
export async function userForKey(header: string | null): Promise<string | null> {
  const m = FORMAT.exec(header?.replace(/^Bearer\s+/i, "") ?? "");
  if (!m) return null;
  const row = await db.select().from(extensionKey).where(eq(extensionKey.id, m[1])).get();
  if (!row) return null;
  const a = Buffer.from(row.hash, "hex");
  const b = Buffer.from(hash(m[2]), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  await db.update(extensionKey).set({ usedAt: new Date() }).where(eq(extensionKey.id, row.id));
  return row.userId;
}

/** Your connected browsers, newest first, for Settings */
export function getKeys(userId: string) {
  return db
    .select({ id: extensionKey.id, createdAt: extensionKey.createdAt, usedAt: extensionKey.usedAt })
    .from(extensionKey)
    .where(eq(extensionKey.userId, userId))
    .orderBy(desc(extensionKey.createdAt));
}

export async function dropKey(userId: string, id: string) {
  await db.delete(extensionKey).where(and(eq(extensionKey.id, id), eq(extensionKey.userId, userId)));
}

/** The name the popup shows ("Connected as @pyv") */
export async function nameOf(userId: string) {
  const u = await db.select({ username: user.username, name: user.name }).from(user).where(eq(user.id, userId)).get();
  return u?.username ? `@${u.username}` : (u?.name ?? "");
}
