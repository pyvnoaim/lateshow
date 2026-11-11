"use server";

import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { room, roomMember } from "@/lib/db/schema";
import { getFriends } from "@/lib/friends/queries";
import { safeNext } from "@/lib/safeNext";
import { redeemHandoff } from "./handoff";
import { GUEST_COOKIE, getRoomIdentity, guestMemberId } from "./identity";
import { cleanCode, cleanGuestName, newRoomCode, ROOM_HOURS } from "./rules";

const bump = (code: string) =>
  db
    .update(room)
    .set({ version: sql`${room.version} + 1` })
    .where(eq(room.code, code));

const startInput = z.object({
  kind: z.enum(["movie", "tv"]),
  game: z.enum(["swipe", "bracket", "reel"]),
  friends: z.array(z.string()).max(20),
});

/** Opens a room you host. Friends you tick get an invite on their Home. Needs a username (guests see it). */
export async function createRoom(input: z.input<typeof startInput>): Promise<{ code: string } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Sign in to start a room." };
  if (!session.user.username) return { error: "Pick a username in Settings first. Everyone in the room sees it." };
  const { kind, game, friends } = startInput.parse(input);
  const mine = (await getFriends(session.user.id)).filter((f) => friends.includes(f.id) && f.username);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    try {
      db.transaction((tx) => {
        tx.insert(room)
          .values({
            code,
            hostId: session.user.id,
            kind,
            game,
            expiresAt: new Date(Date.now() + ROOM_HOURS * 3600_000),
          })
          .run();
        tx.insert(roomMember).values({ roomCode: code, memberId: session.user.id, name: session.user.username! }).run();
        for (const f of mine) {
          tx.insert(roomMember).values({ roomCode: code, memberId: f.id, name: f.username!, joined: false }).run();
        }
      });
      return { code };
    } catch {
      // the code was taken by an open room, try another
    }
  }
  return { error: "Couldn't open a room right now. Try again." };
}

/** Joins a room with your account (also accepts an invite). */
export async function joinRoom(raw: string) {
  const code = cleanCode(raw);
  const me = await getRoomIdentity();
  if (!code || !me || me.guest || !me.name) return;
  await db
    .insert(roomMember)
    .values({ roomCode: code, memberId: me.id, name: me.name })
    .onConflictDoUpdate({ target: [roomMember.roomCode, roomMember.memberId], set: { joined: true } });
  await bump(code);
  refresh();
}

/** Joins without an account: a name, and a random id remembered in this browser for this room and the next. */
export async function joinAsGuest(raw: string, rawName: string): Promise<string | null> {
  const code = cleanCode(raw);
  const name = cleanGuestName(rawName);
  if (!code) return "That room doesn't exist.";
  if (!name) return "Use 1 to 20 characters.";
  const jar = await cookies();
  let guest = jar.get(GUEST_COOKIE)?.value;
  if (!guest || !/^[a-f0-9]{32}$/.test(guest)) {
    guest = randomBytes(16).toString("hex");
    jar.set(GUEST_COOKIE, guest, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  }
  await db
    .insert(roomMember)
    .values({ roomCode: code, memberId: guestMemberId(guest), name })
    .onConflictDoUpdate({ target: [roomMember.roomCode, roomMember.memberId], set: { name, joined: true } });
  await bump(code);
  refresh();
  return null;
}

/** The host starts the game. Late joiners can still come in. */
export async function startRoom(raw: string) {
  const code = cleanCode(raw);
  const session = await getSession();
  if (!code || !session) return;
  await db
    .update(room)
    .set({ status: "playing", version: sql`${room.version} + 1` })
    .where(and(eq(room.code, code), eq(room.hostId, session.user.id), eq(room.status, "lobby")));
  refresh();
}

/** Leaves a room. When the host leaves, the room closes for everyone. */
export async function leaveRoom(raw: string) {
  const code = cleanCode(raw);
  const me = await getRoomIdentity();
  if (!code || !me) return;
  db.transaction((tx) => {
    tx.delete(roomMember)
      .where(and(eq(roomMember.roomCode, code), eq(roomMember.memberId, me.id)))
      .run();
    tx.update(room)
      .set({ status: "done" })
      .where(and(eq(room.code, code), eq(room.hostId, me.id)))
      .run();
    tx.update(room)
      .set({ version: sql`${room.version} + 1` })
      .where(eq(room.code, code))
      .run();
  });
}

/**
 * "Continue as @name" on the phone. A server action (a same-origin POST), so a link alone can't sign anyone in.
 * A device that is already signed in keeps its own account and just opens the room.
 */
export async function continueOnDevice(form: FormData) {
  const token = String(form.get("t") ?? "");
  const safe = safeNext(String(form.get("next") ?? "/"));
  if (!(await getSession()) && !(await redeemHandoff(token))) redirect(`/login?next=${encodeURIComponent(safe)}`);
  redirect(safe);
}
