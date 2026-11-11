"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userServices } from "@/lib/db/schema";
import { LANGUAGE_COOKIE, LANGUAGES } from "@/lib/languages";

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
  (await cookies()).set(LANGUAGE_COOKIE, language.parse(code), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  refresh();
}
