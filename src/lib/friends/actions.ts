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
export async function getInviteLink(fresh = false): Promise<InviteLink> {
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
    if (fresh) tx.update(invite).set({ usesLeft: 0 }).where(eq(invite.userId, userId)).run();
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
  const parsed = code.safeParse(raw);
  if (!parsed.success) return "missing";
  const me = session.user.id;
  const result = db.transaction((tx): AcceptResult => {
    const inv = tx.select().from(invite).where(eq(invite.code, parsed.data)).get();
    if (!inv) return "missing";
    const state = inviteState(inv, me, new Date());
    if (state !== "ok") return state;
    const added = tx.insert(friendship).values(pair(me, inv.userId)).onConflictDoNothing().run();
    if (added.changes === 0) return "already";
    // only a new friendship uses up the invite, and never below 0 (two people accepting at once)
    tx.update(invite)
      .set({ usesLeft: sql`${invite.usesLeft} - 1` })
      .where(and(eq(invite.code, inv.code), gt(invite.usesLeft, 0)))
      .run();
    return "friends";
  });
  if (result === "friends") refresh();
  return result;
}
