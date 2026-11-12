"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { list, listItem } from "@/lib/db/schema";
import { newInviteCode } from "@/lib/friends/rules";
import { createRoom } from "@/lib/rooms/actions";
import { getList } from "./queries";

const name = z.string().trim().min(1).max(60);
const id = z.string().regex(/^[a-z0-9]{16}$/);
const titleRef = z.object({
  type: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  posterPath: z
    .string()
    .regex(/^\/[\w.-]+$/)
    .nullable(),
});
export type ListTitleRef = z.input<typeof titleRef>;

async function requireUserId() {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  return session.user.id;
}

/** Only the owner changes a list: every write goes through this. */
const own = (listId: string, userId: string) => and(eq(list.id, id.parse(listId)), eq(list.userId, userId));

/** A new list, private until you share it. With `first`, that title goes on it right away (first, so it binds). */
export async function createList(first: ListTitleRef | null, rawName: string) {
  const userId = await requireUserId();
  const listId = newInviteCode(16); // ~79 bits: a "link" list must not be found by guessing
  const t = first ? titleRef.parse(first) : null;
  db.transaction((tx) => {
    tx.insert(list)
      .values({ id: listId, userId, name: name.parse(rawName) })
      .run();
    if (t)
      tx.insert(listItem)
        .values({ listId, mediaType: t.type, tmdbId: t.tmdbId, title: t.title, posterPath: t.posterPath })
        .run();
  });
  refresh();
  return listId;
}

/** Puts a title on one of your lists or takes it off (title first, so a page can bind it). */
export async function setInList(ref: ListTitleRef, listId: string, on: boolean) {
  const userId = await requireUserId();
  const t = titleRef.parse(ref);
  const [l] = await db.select({ id: list.id }).from(list).where(own(listId, userId));
  if (!l) throw new Error("Not your list.");
  if (on) {
    await db
      .insert(listItem)
      .values({ listId: l.id, mediaType: t.type, tmdbId: t.tmdbId, title: t.title, posterPath: t.posterPath })
      .onConflictDoNothing();
  } else {
    await db
      .delete(listItem)
      .where(and(eq(listItem.listId, l.id), eq(listItem.mediaType, t.type), eq(listItem.tmdbId, t.tmdbId)));
  }
  refresh();
}

export async function renameList(listId: string, rawName: string) {
  const userId = await requireUserId();
  await db
    .update(list)
    .set({ name: name.parse(rawName) })
    .where(own(listId, userId));
  refresh();
}

export async function setListVisibility(listId: string, raw: string) {
  const userId = await requireUserId();
  const visibility = z.enum(["private", "friends", "link"]).parse(raw);
  await db.update(list).set({ visibility }).where(own(listId, userId));
  refresh();
}

export async function deleteList(listId: string) {
  const userId = await requireUserId();
  await db.delete(list).where(own(listId, userId));
  redirect("/u/me?tab=lists");
}

/** "Pick one together": a swipe room over this list's titles (the kind most of them are). */
export async function swipeList(listId: string): Promise<{ error: string } | undefined> {
  const userId = await requireUserId();
  const l = await getList(id.parse(listId), userId);
  if (!l) return { error: "That list is gone." };
  const movies = l.items.filter((i) => i.mediaType === "movie").length;
  const kind = movies * 2 >= l.items.length ? "movie" : "tv";
  const made = await createRoom({ kind, game: "swipe", friends: [], listId: l.id });
  if ("error" in made) return made;
  redirect(`/rooms/${made.code}`);
}
