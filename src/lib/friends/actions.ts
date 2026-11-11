"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { friendship, invite } from "@/lib/db/schema";
import { getOpenInvite } from "./queries";
import { INVITE_DAYS, INVITE_USES, inviteState, newInviteCode, pair } from "./rules";

export type InviteLink = { code: string; expiresAt: Date; usesLeft: number } | { error: "username" | "signin" };

/**
 * Your invite link. Reuses the one that still works, or makes one. `fresh` makes a new one and retires the old ones
 * (for a link that was shared too widely). Needs a username: invites show it, never your email.
 */
export async function getInviteLink(raw = false): Promise<InviteLink> {
  const fresh = z.boolean().parse(raw);
  const session = await getSession();
  if (!session) return { error: "signin" };
  if (!session.user.username) return { error: "username" };
  const userId = session.user.id;
  if (!fresh) {
    const open = await getOpenInvite(userId);
    if (open) return { code: open.code, expiresAt: open.expiresAt, usesLeft: open.usesLeft };
  }
  const created = {
    code: newInviteCode(),
    userId,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    usesLeft: INVITE_USES,
  };
  db.transaction((tx) => {
    // a new link replaces your old ones (deleted, so repeated clicks can't pile up rows)
    if (fresh) tx.delete(invite).where(eq(invite.userId, userId)).run();
    tx.insert(invite).values(created).run();
  });
  return { code: created.code, expiresAt: created.expiresAt, usesLeft: created.usesLeft };
}

export type AcceptResult = "friends" | "already" | "expired" | "used" | "own" | "missing" | "username" | "signin";

const code = z.string().regex(/^[a-z0-9]{6,20}$/);

/** Accepts an invite: you and the sender become friends (both ways) and the invite has one use less. */
export async function acceptInvite(raw: string): Promise<AcceptResult> {
  const session = await getSession();
  if (!session) return "signin";
  if (!session.user.username) return "username";
  const parsed = code.safeParse(raw.trim().toLowerCase()); // codes are case-insensitive, like on the invite page
  if (!parsed.success) return "missing";
  const me = session.user.id;
  const usedUp = new Error("used");
  let result: AcceptResult;
  try {
    result = db.transaction((tx): AcceptResult => {
      const inv = tx.select().from(invite).where(eq(invite.code, parsed.data)).get();
      if (!inv) return "missing";
      const state = inviteState(inv, me, new Date());
      if (state !== "ok") return state;
      const added = tx.insert(friendship).values(pair(me, inv.userId)).onConflictDoNothing().run();
      if (added.changes === 0) return "already";
      // Only a new friendship uses up the invite. If someone else just took the last use (another server process),
      // throwing rolls the friendship back too.
      const spent = tx
        .update(invite)
        .set({ usesLeft: sql`${invite.usesLeft} - 1` })
        .where(and(eq(invite.code, inv.code), gt(invite.usesLeft, 0)))
        .run();
      if (spent.changes === 0) throw usedUp;
      return "friends";
    });
  } catch (e) {
    if (e === usedUp) return "used";
    throw e;
  }
  if (result === "friends") refresh();
  return result;
}

/** Ends a friendship, both ways. The other person isn't told. */
export async function removeFriend(friendId: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in first.");
  const { a, b } = pair(session.user.id, z.string().min(1).parse(friendId));
  await db.delete(friendship).where(and(eq(friendship.a, a), eq(friendship.b, b)));
  refresh();
}
