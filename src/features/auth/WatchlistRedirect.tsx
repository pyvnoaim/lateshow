import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const WATCHLIST = "/u/me?tab=watchlist";

export async function WatchlistRedirect() {
  redirect((await getSession()) ? WATCHLIST : `/login?next=${encodeURIComponent(WATCHLIST)}`);
  return null;
}
