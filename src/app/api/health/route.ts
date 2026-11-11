import { connection } from "next/server";
import { dbIsUp } from "@/lib/health";

// For the Docker healthcheck and the uptime monitor. 503 when the database is gone.
export async function GET() {
  await connection();
  const ok = dbIsUp();
  return Response.json({ ok }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
