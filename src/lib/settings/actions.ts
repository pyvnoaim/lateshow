"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/auth-schema";
import { userServices } from "@/lib/db/schema";
import { LANGUAGE_COOKIE, LANGUAGES } from "@/lib/languages";
import { SPOILER_COOKIE } from "@/lib/settings/queries";

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

const displayName = z.string().trim().min(1).max(40);

/** The name shown on your profile (and to friends later). */
export async function setName(name: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in to save this.");
  await db
    .update(user)
    .set({ name: displayName.parse(name), updatedAt: new Date() })
    .where(eq(user.id, session.user.id));
  refresh();
}

/**
 * Deletes the account for good. History, watchlist, services and sessions go with it
 * (foreign keys cascade from the user row). Then the login cookie is dropped and you land on Home.
 */
export async function deleteAccount() {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  await db.delete(user).where(eq(user.id, session.user.id));
  const jar = await cookies();
  // Expire every Better Auth cookie. __Secure- ones (https) only accept an overwrite that is Secure too.
  for (const { name } of jar.getAll()) {
    if (name.includes("better-auth")) jar.set(name, "", { path: "/", maxAge: 0, secure: name.startsWith("__Secure-") });
  }
  redirect("/");
}
