import { userForKey } from "@/lib/extension/keys";
import { cleanCode } from "@/lib/rooms/rules";
import { getPlusOne, movePlusOne } from "@/lib/rooms/plusOne";

// Plus one: the extension follows (GET, a stream) and moves (POST) a room's shared player. Its own key only
// (Authorization: Bearer ls_…, read by fetch, not EventSource, which can't send it), never a cookie.

const TICK_MS = 500;
const MAX_MS = 15 * 60_000; // the extension reconnects, so no stream lives forever

async function who(request: Request, params: Promise<{ code: string }>) {
  const code = cleanCode((await params).code);
  const userId = await userForKey(request.headers.get("authorization"), request.headers.get("user-agent"));
  return { code, userId };
}

/**
 * Server-sent events: the room's player whenever it changes (pause, play, skip, who may), each with the server's
 * clock. ponytail: reads the room twice a second per watcher, fine for a few rooms. A pub/sub if many watch at once.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code, userId } = await who(request, params);
  if (!userId) return Response.json({ error: "Connect the extension in Lateshow's Settings again." }, { status: 401 });
  if (!code || !(await getPlusOne(code, userId)))
    return Response.json({ error: "That room is gone." }, { status: 404 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let last = "";
      const started = Date.now();
      while (!request.signal.aborted && Date.now() - started < MAX_MS) {
        const state = await getPlusOne(code, userId);
        if (!state) {
          controller.enqueue(encoder.encode("event: gone\ndata: 1\n\n"));
          break;
        }
        const { now, ...rest } = state;
        const key = JSON.stringify(rest);
        if (key !== last) controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        else controller.enqueue(encoder.encode(`: ${now}\n\n`)); // keep-alive, also the server's clock
        last = key;
        await new Promise((r) => setTimeout(r, TICK_MS));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** You played, paused or skipped */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code, userId } = await who(request, params);
  if (!userId) return Response.json({ error: "Connect the extension in Lateshow's Settings again." }, { status: 401 });
  if (!code) return Response.json({ error: "That room is gone." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  try {
    const r = await movePlusOne(code, userId, body);
    return "error" in r ? Response.json({ error: r.error }, { status: r.status }) : Response.json(r);
  } catch {
    return Response.json({ error: "That update couldn't be read." }, { status: 400 });
  }
}
