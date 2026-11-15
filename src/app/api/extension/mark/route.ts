import { userForKey } from "@/lib/extension/keys";
import { markFromExtension, undoMark } from "@/lib/extension/mark";

// The extension's marks. Only its own key counts (Authorization: Bearer ls_…), never a cookie, so no website can
// make your browser call this. ponytail: no rate limit, a key can only mark its own user's watches.

async function withKey(request: Request, run: (userId: string, body: unknown) => Promise<unknown>) {
  const userId = await userForKey(request.headers.get("authorization"), request.headers.get("user-agent"));
  if (!userId) return Response.json({ error: "Connect the extension in Lateshow's Settings again." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  try {
    return Response.json((await run(userId, body)) ?? { ok: true });
  } catch {
    return Response.json({ error: "That mark couldn't be read." }, { status: 400 });
  }
}

/** You finished something: mark it (or say which titles it could be) */
export function POST(request: Request) {
  return withKey(request, markFromExtension);
}

/** Undo from the toast: removes what that mark created */
export function DELETE(request: Request) {
  return withKey(request, undoMark);
}
