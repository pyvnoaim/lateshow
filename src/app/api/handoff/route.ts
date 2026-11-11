import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/features/auth/next";
import { redeemHandoff } from "@/lib/rooms/handoff";

// The QR on a room's lobby points here. The token signs this device in once, then you land in the room.
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next") ?? undefined);
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const ok = token.length > 0 && token.length < 200 && (await redeemHandoff(token));
  redirect(ok ? next : `/login?next=${encodeURIComponent(next)}`);
}
