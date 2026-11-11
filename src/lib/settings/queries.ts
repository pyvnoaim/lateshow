import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userServices } from "@/lib/db/schema";

/** TMDB provider ids of the services the signed in user pays for. Empty when signed out or none picked. */
export const getMyServiceIds = cache(async (): Promise<number[]> => {
  const session = await getSession();
  if (!session) return [];
  const rows = await db
    .select({ id: userServices.providerId })
    .from(userServices)
    .where(eq(userServices.userId, session.user.id));
  return rows.map((r) => r.id);
});
