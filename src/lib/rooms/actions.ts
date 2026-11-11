"use server";

import { randomBytes, randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { room, roomMember, roomMood, roomPick, roomVote } from "@/lib/db/schema";
import { getFriends } from "@/lib/friends/queries";
import { getRegion } from "@/lib/region";
import { BRACKET_SIZE, bracketState } from "./bracket";
import { buildDeck } from "./deck";
import { pickForMood } from "./reel";
import { findMatch } from "./swipe";
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

/** Loads a room for the host, or null when you aren't its host. */
async function hostedRoom(raw: string) {
  const code = cleanCode(raw);
  const session = await getSession();
  if (!code || !session) return null;
  const [r] = await db
    .select()
    .from(room)
    .where(and(eq(room.code, code), eq(room.hostId, session.user.id)));
  return r ?? null;
}

/** Deals a fresh deck for the people in the room right now (their services, the host's country). */
async function deal(r: typeof room.$inferSelect, round: number) {
  const members = await db
    .select({ id: roomMember.memberId })
    .from(roomMember)
    .where(and(eq(roomMember.roomCode, r.code), eq(roomMember.joined, true)));
  const country = r.country ?? (await getRegion()).code;
  const people = members.map((m) => m.id).filter((id) => !id.startsWith("guest:"));
  const size = r.game === "bracket" ? BRACKET_SIZE : undefined;
  return { country, ...(await buildDeck(r.code, r.kind, people, country, round, size)) };
}

/** The host starts the game. Swipe gets its shared deck now. Late joiners can still come in. */
export async function startRoom(raw: string) {
  const r = await hostedRoom(raw);
  if (!r || r.status !== "lobby") return;
  const dealt = r.game === "reel" ? {} : await deal(r, 0);
  await db
    .update(room)
    .set({ status: "playing", ...dealt, version: sql`${room.version} + 1` })
    .where(eq(room.code, r.code));
  refresh();
}

/** Host: a new deck and a clean slate (votes and the winner go). */
export async function playAgain(raw: string) {
  const r = await hostedRoom(raw);
  if (!r || r.status !== "playing") return;
  const round = (r.version % 97) + 1;
  const dealt = await deal(r, round);
  db.transaction((tx) => {
    tx.delete(roomVote).where(eq(roomVote.roomCode, r.code)).run();
    tx.delete(roomPick).where(eq(roomPick.roomCode, r.code)).run();
    tx.update(room)
      .set({ ...dealt, winner: null, version: sql`${room.version} + 1` })
      .where(eq(room.code, r.code))
      .run();
  });
  refresh();
}

const vote = z.object({ tmdbId: z.number().int().positive(), like: z.boolean() });

/**
 * One swipe. A yes can finish the game: the first title in the deck everyone in the room liked wins
 * (everyone joined right now, so a late joiner's yes counts too).
 */
export async function swipe(raw: string, input: z.input<typeof vote>) {
  const code = cleanCode(raw);
  const me = await getRoomIdentity();
  const parsed = vote.safeParse(input);
  if (!code || !me || !parsed.success) return;
  const { tmdbId, like } = parsed.data;
  db.transaction((tx) => {
    const r = tx.select().from(room).where(eq(room.code, code)).get();
    if (!r || r.status !== "playing" || r.winner || !r.deck?.includes(tmdbId)) return;
    const members = tx
      .select({ id: roomMember.memberId })
      .from(roomMember)
      .where(and(eq(roomMember.roomCode, code), eq(roomMember.joined, true)))
      .all()
      .map((m) => m.id);
    if (!members.includes(me.id)) return;
    tx.insert(roomVote)
      .values({ roomCode: code, memberId: me.id, tmdbId, like })
      .onConflictDoUpdate({ target: [roomVote.roomCode, roomVote.memberId, roomVote.tmdbId], set: { like } })
      .run();
    const likes = new Map<number, Set<string>>();
    for (const v of tx
      .select()
      .from(roomVote)
      .where(and(eq(roomVote.roomCode, code), eq(roomVote.like, true)))
      .all()) {
      likes.set(v.tmdbId, (likes.get(v.tmdbId) ?? new Set()).add(v.memberId));
    }
    tx.update(room)
      .set({ winner: findMatch(r.deck, likes, members), version: sql`${room.version} + 1` })
      .where(eq(room.code, code))
      .run();
  });
}

const pick = z.object({ match: z.number().int().min(0).max(6), choice: z.number().int().positive() });

/** A bracket vote on the match being played. The final's winner becomes the room's winner. */
export async function pickInBracket(raw: string, input: z.input<typeof pick>) {
  const code = cleanCode(raw);
  const me = await getRoomIdentity();
  const parsed = pick.safeParse(input);
  if (!code || !me || !parsed.success) return;
  const { match, choice } = parsed.data;
  db.transaction((tx) => {
    const r = tx.select().from(room).where(eq(room.code, code)).get();
    if (!r || r.status !== "playing" || r.game !== "bracket" || r.winner || !r.deck) return;
    const members = tx
      .select({ id: roomMember.memberId })
      .from(roomMember)
      .where(and(eq(roomMember.roomCode, code), eq(roomMember.joined, true)))
      .all()
      .map((m) => m.id);
    if (!members.includes(me.id)) return;
    const votesOf = () => {
      const all = new Map<number, Map<string, number>>();
      for (const p of tx.select().from(roomPick).where(eq(roomPick.roomCode, code)).all()) {
        all.set(p.match, (all.get(p.match) ?? new Map()).set(p.memberId, p.choice));
      }
      return all;
    };
    // only the match being played, and only one of its two titles
    const now = bracketState(r.deck, votesOf(), members).current;
    if (!now || now.index !== match || (choice !== now.a && choice !== now.b)) return;
    tx.insert(roomPick)
      .values({ roomCode: code, memberId: me.id, match, choice })
      .onConflictDoUpdate({ target: [roomPick.roomCode, roomPick.memberId, roomPick.match], set: { choice } })
      .run();
    tx.update(room)
      .set({ winner: bracketState(r.deck, votesOf(), members).champion, version: sql`${room.version} + 1` })
      .where(eq(room.code, code))
      .run();
  });
}

const moodText = z.string().trim().min(1).max(40);

/** Reel: your mood for tonight. One each, a new one replaces yours. */
export async function addMood(raw: string, text: string): Promise<string | null> {
  const code = cleanCode(raw);
  const me = await getRoomIdentity();
  const mood = moodText.safeParse(text.replace(/\s+/g, " "));
  if (!code || !me) return "You're not in this room.";
  if (!mood.success) return "Use 1 to 40 characters.";
  const [member] = await db
    .select({ name: roomMember.name })
    .from(roomMember)
    .where(and(eq(roomMember.roomCode, code), eq(roomMember.memberId, me.id), eq(roomMember.joined, true)));
  if (!member) return "You're not in this room.";
  await db
    .insert(roomMood)
    .values({ roomCode: code, memberId: me.id, name: member.name, mood: mood.data })
    .onConflictDoUpdate({ target: [roomMood.roomCode, roomMood.memberId], set: { mood: mood.data } });
  await bump(code);
  return null;
}

/** Host: spin. The server picks the mood (so every screen lands on the same one) and its 3 picks. */
export async function spinReel(raw: string) {
  const r = await hostedRoom(raw);
  if (!r || r.status !== "playing" || r.game !== "reel" || r.mood) return;
  const moods = await db.select().from(roomMood).where(eq(roomMood.roomCode, r.code));
  if (moods.length === 0) return;
  const landed = moods[randomInt(moods.length)].mood;
  const members = await db
    .select({ id: roomMember.memberId })
    .from(roomMember)
    .where(and(eq(roomMember.roomCode, r.code), eq(roomMember.joined, true)));
  const country = r.country ?? (await getRegion()).code;
  const people = members.map((m) => m.id).filter((id) => !id.startsWith("guest:"));
  const picked = await pickForMood(r.code, r.kind, landed, people, country);
  await db
    .update(room)
    .set({ mood: landed, country, ...picked, version: sql`${room.version} + 1` })
    .where(eq(room.code, r.code));
}

/** Host: back to the moods (they stay), ready for another spin. */
export async function spinAgain(raw: string) {
  const r = await hostedRoom(raw);
  if (!r || r.game !== "reel") return;
  await db
    .update(room)
    .set({ mood: null, deck: null, version: sql`${room.version} + 1` })
    .where(eq(room.code, r.code));
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
