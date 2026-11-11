"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { passkey, user } from "@/lib/db/auth-schema";
import { roomMember, roomMood, roomPick, roomVote, userServices } from "@/lib/db/schema";
import { LANGUAGE_COOKIE, LANGUAGES } from "@/lib/languages";
import { SPOILER_COOKIE } from "@/lib/settings/queries";
import { checkUsername } from "@/lib/username";

const providerId = z.number().int().positive();

/** Adds or removes one streaming service from the signed in user's services. */
export async function setMyService(id: number, on: boolean) {
  const session = await getSession();
  if (!session) throw new Error("Sign in to save this.");
  const userId = session.user.id;
  const pid = providerId.parse(id);
  if (on) {
    await db.insert(userServices).values({ userId, providerId: pid }).onConflictDoNothing();
  } else {
    await db.delete(userServices).where(and(eq(userServices.userId, userId), eq(userServices.providerId, pid)));
  }
  refresh();
}

const language = z.enum(LANGUAGES.map((l) => l.code) as [string, ...string[]]);

/** Saves the language for TMDB titles and descriptions in a cookie (works signed out too, nothing tracked). */
export async function setLanguage(code: string) {
  (await cookies()).set(LANGUAGE_COOKIE, language.parse(code), PREFERENCE);
  refresh();
}

const PREFERENCE = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true } as const;

/** Spoiler guard: "hide" titles of unwatched episodes or "show" them (cookie, like the language). */
export async function setSpoilerGuard(value: "show" | "hide") {
  (await cookies()).set(SPOILER_COOKIE, z.enum(["show", "hide"]).parse(value), PREFERENCE);
  refresh();
}

/** What a text setting's save returns: the value as stored, or what went wrong. */
export type Saved = { value: string } | { error: string };

/** Your username: the name everyone sees and your profile address (/u/name). Unique, stored lowercase. */
export async function setUsername(raw: string): Promise<Saved> {
  const session = await getSession();
  if (!session) return { error: "Sign in again to save this." };
  const check = checkUsername(raw);
  if (!check.ok) return { error: check.error };
  const uid = session.user.id;
  const taken = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.username, check.value), ne(user.id, uid)))
    .limit(1);
  if (taken.length > 0) return { error: "That one is taken." };
  try {
    // Better Auth's `name` follows the username, so there is only one name anywhere
    await db
      .update(user)
      .set({ username: check.value, name: check.value, updatedAt: new Date() })
      .where(eq(user.id, uid));
  } catch {
    return { error: "That one is taken." }; // the unique index caught a race with someone else
  }
  refresh();
  return { value: check.value };
}

/**
 * Deletes the account for good. History, watchlist, services and sessions go with it
 * (foreign keys cascade from the user row). Then the login cookie is dropped and you land on Home.
 */
export async function deleteAccount() {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  const uid = session.user.id;
  db.transaction((tx) => {
    // your part of other people's rooms (those rows point at you by id, no foreign key), then you
    for (const table of [roomVote, roomPick, roomMood, roomMember])
      tx.delete(table).where(eq(table.memberId, uid)).run();
    tx.delete(user).where(eq(user.id, uid)).run();
  });
  const jar = await cookies();
  // Expire every Better Auth cookie. __Secure- ones (https) only accept an overwrite that is Secure too.
  for (const { name } of jar.getAll()) {
    if (name.includes("better-auth")) jar.set(name, "", { path: "/", maxAge: 0, secure: name.startsWith("__Secure-") });
  }
  redirect("/");
}

/** Whether friends see your history, watchlist and stats. */
export async function setShareActivity(value: "share" | "private") {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  const share = z.enum(["share", "private"]).parse(value) === "share";
  await db.update(user).set({ shareActivity: share, updatedAt: new Date() }).where(eq(user.id, session.user.id));
  refresh();
}

/** Removes one of your passkeys (that device then signs in with a code again). */
export async function removePasskey(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  await db.delete(passkey).where(and(eq(passkey.id, z.string().min(1).parse(id)), eq(passkey.userId, session.user.id)));
  refresh();
}
