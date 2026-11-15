import { userForKey } from "@/lib/extension/keys";
import { syncFromExtension } from "@/lib/extension/sync";

// Sync from the extension's popup: rows it read on a streaming site, imported for the key's user. Only the extension's
// key counts (Authorization: Bearer ls_…), never a cookie, so no website can make your browser call this. It can only
// add watches, the same as an import in Settings, and every run can be removed there.
export async function POST(request: Request) {
  const userId = await userForKey(request.headers.get("authorization"), request.headers.get("user-agent"));
  if (!userId) return Response.json({ error: "Connect the extension in Lateshow's Settings again." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  try {
    return Response.json(await syncFromExtension(userId, body));
  } catch {
    return Response.json({ error: "That batch couldn't be read." }, { status: 400 });
  }
}
