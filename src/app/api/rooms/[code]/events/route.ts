import { getRoomVersion } from "@/lib/rooms/queries";
import { cleanCode } from "@/lib/rooms/rules";

const TICK_MS = 1000;
const MAX_MS = 15 * 60_000; // browsers reconnect on their own, so no stream lives forever

/**
 * Server-sent events for a room: sends the room's version whenever it changes, the page then refreshes.
 * ponytail: checks the database once a second per open lobby. Fine for a few rooms at a time, and works across
 * several server processes. A pub/sub (or SQLite update hook) if many rooms run at once.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = cleanCode((await params).code);
  if (!code || !(await getRoomVersion(code))) return new Response("No such room", { status: 404 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let last = -1;
      const started = Date.now();
      while (!req.signal.aborted && Date.now() - started < MAX_MS) {
        const now = await getRoomVersion(code);
        if (!now) {
          controller.enqueue(encoder.encode("event: gone\ndata: 1\n\n"));
          break;
        }
        if (now.version !== last) {
          if (last !== -1) controller.enqueue(encoder.encode(`data: ${now.version}\n\n`));
          last = now.version;
        } else {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
        await new Promise((r) => setTimeout(r, TICK_MS));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" },
  });
}
