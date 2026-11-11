import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { shownName } from "@/lib/username";

/** Cookie that remembers a guest (joined by code, no account) in this browser. Holds a random secret, nothing else. */
export const GUEST_COOKIE = "room_guest";

/**
 * A guest's member id: a hash of their cookie secret. The id is sent to everyone in the room (it keys the member
 * list), the secret never is, so nobody can copy someone's id into their own cookie and play as them.
 */
export const guestMemberId = (secret: string) =>
  `guest:${createHash("sha256").update(secret).digest("hex").slice(0, 32)}`;

export type RoomIdentity = { id: string; name: string | null; guest: boolean; username: string | null };

/** Who is looking at a room: your account, or the guest id this browser got when joining by code, or nobody. */
export async function getRoomIdentity(): Promise<RoomIdentity | null> {
  const session = await getSession();
  if (session) {
    return {
      id: session.user.id,
      name: shownName(session.user),
      guest: false,
      username: session.user.username ?? null,
    };
  }
  const guest = (await cookies()).get(GUEST_COOKIE)?.value;
  return guest && /^[a-f0-9]{32}$/.test(guest)
    ? { id: guestMemberId(guest), name: null, guest: true, username: null }
    : null;
}
