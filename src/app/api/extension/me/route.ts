import { nameOf, userForKey } from "@/lib/extension/keys";

/** Who the extension is connected as, for its popup. 401 once the key is disconnected. */
export async function GET(request: Request) {
  const userId = await userForKey(request.headers.get("authorization"));
  if (!userId) return Response.json({ error: "Not connected" }, { status: 401 });
  return Response.json({ name: await nameOf(userId) });
}
