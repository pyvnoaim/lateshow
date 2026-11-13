import { BUILD_ID } from "@/lib/build";

/**
 * The build the server runs now. An open tab compares it with the build it was loaded from, see UpdateBar.
 * no-store keeps Cloudflare from holding an old one.
 */
export function GET() {
  return Response.json({ id: BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
