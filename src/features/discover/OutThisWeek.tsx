import { getSession } from "@/lib/auth";
import { getOutThisWeek } from "@/lib/library/watchlistView";
import { getRegion } from "@/lib/region";
import { PosterSection } from "./PosterSection";

/** On Home: titles from your watchlist that came out in the last 7 days (cinema, streaming, a new series). */
export async function OutThisWeek() {
  const session = await getSession();
  if (!session) return null;
  const { code, lang } = await getRegion();
  const out = await getOutThisWeek(session.user.id, code, lang).catch(() => []);
  return (
    <PosterSection
      title="Out this week from your list"
      description="You saved these. Now they're here."
      cards={out.map((o) => o.card)}
    />
  );
}
