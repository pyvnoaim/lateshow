"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userServices } from "@/lib/db/schema";

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
