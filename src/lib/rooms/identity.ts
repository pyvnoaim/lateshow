import "server-only";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { shownName } from "@/lib/username";

/** Cookie that remembers a guest (joined by code, no account) in this browser. Holds a random id, nothing else. */
export const GUEST_COOKIE = "room_guest";

export type RoomIdentity = { id: string; name: string | null; guest: boolean };

/** Who is looking at a room: your account, or the guest id this browser got when joining by code, or nobody. */
export async function getRoomIdentity(): Promise<RoomIdentity | null> {
  const session = await getSession();
  if (session) return { id: session.user.id, name: shownName(session.user), guest: false };
  const guest = (await cookies()).get(GUEST_COOKIE)?.value;
  return guest && /^[a-f0-9]{32}$/.test(guest) ? { id: `guest:${guest}`, name: null, guest: true } : null;
}
