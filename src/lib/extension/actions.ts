"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { dropKey, newKey } from "./keys";

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  return session.user.id;
}

/** Settings › Extension › Connect (you clicked it, signed in): a new key, handed to the extension on this page only */
export async function connectExtension(): Promise<string> {
  const key = await newKey(await requireUserId(), (await headers()).get("user-agent"));
  refresh();
  return key;
}

/** Settings › Extension › Disconnect: that browser's key stops working at once */
export async function disconnectExtension(id: string) {
  await dropKey(await requireUserId(), z.string().max(40).parse(id));
  refresh();
}
