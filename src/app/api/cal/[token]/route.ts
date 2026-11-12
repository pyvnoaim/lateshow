import { calendarFeed } from "@/features/settings/calendarFeed";

// Calendar apps subscribe to this private link, the token stands in for the sign-in.
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const ics = await calendarFeed((await params).token);
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=10800",
    },
  });
}
