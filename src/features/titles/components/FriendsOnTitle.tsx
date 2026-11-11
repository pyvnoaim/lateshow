import { FriendFaces } from "@/components/friends/FriendFaces";
import { Container } from "@/components/ui/Container";
import { friendsSentence } from "@/lib/friends/activity";
import { getFriendsOnTitle } from "@/lib/friends/queries";
import type { MediaType } from "@/lib/tmdb";

/** Under where to watch: "anna_k and 2 friends watched this" · "ben wants to watch this". Nothing without friends. */
export async function FriendsOnTitle({ userId, type, tmdbId }: { userId: string; type: MediaType; tmdbId: number }) {
  const { watched, listed } = await getFriendsOnTitle(userId, type, tmdbId);
  if (watched.length === 0 && listed.length === 0) return null;
  return (
    <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4">
      {watched.length > 0 && <FriendFaces names={watched} text={`${friendsSentence(watched)} watched this`} />}
      {listed.length > 0 && (
        <FriendFaces
          names={listed}
          text={`${friendsSentence(listed)} ${listed.length === 1 ? "wants" : "want"} to watch this`}
        />
      )}
    </Container>
  );
}
