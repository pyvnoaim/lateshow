import { FriendFaces } from "@/components/friends/FriendFaces";
import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { friendsSentence } from "@/lib/friends/activity";
import { getFriendsWatched } from "@/lib/friends/queries";
import { getLanguage } from "@/lib/region";
import { getTitle, titleToCard } from "@/lib/tmdb";

/** What your friends watched in the last 7 days. The usual caption, then who watched it. Nothing without friends. */
export async function FriendsWeek() {
  const session = await getSession();
  if (!session) return null;
  const week = (await getFriendsWatched(session.user.id)).slice(0, 12);
  if (week.length === 0) return null;
  const lang = await getLanguage();
  const titles = await Promise.all(
    week.map(async (w) => {
      const t = await getTitle(w.mediaType, String(w.tmdbId), lang).catch(() => null);
      return t ? { card: titleToCard(t, w.mediaType), names: w.names } : null;
    }),
  );
  return (
    <Section title="Friends this week" description="What your friends watched in the last 7 days.">
      <PosterGrid>
        {titles
          .filter((x) => x !== null)
          .map(({ card, names }, i) => (
            <div key={`${card.media_type}-${card.id}`} className="flex flex-col gap-2">
              <PosterLink card={card} index={i} morph={false} />
              <FriendFaces names={names} text={friendsSentence(names)} />
            </div>
          ))}
      </PosterGrid>
    </Section>
  );
}
