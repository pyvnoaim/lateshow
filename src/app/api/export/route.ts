import { getSession } from "@/lib/auth";
import { exportLibrary } from "@/lib/library/export";

// A download needs a URL, so this one is a route, not a server action.
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Sign in first.", { status: 401 });
  return new Response(await exportLibrary(session.user.id), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lateshow-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
