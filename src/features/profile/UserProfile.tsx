import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getFriendship, getUserByUsername } from "@/lib/friends/queries";
import { Profile } from "./Profile";

/**
 * /u/[username]: your own profile, or a friend's. Anyone else (or anyone signed out) gets a 404, the same as a
 * name that doesn't exist, so usernames can't be probed.
 */
export async function UserProfile({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ username }, session] = await Promise.all([params, getSession()]);
  if (!session) notFound();
  if (session.user.username && session.user.username === username.toLowerCase()) {
    return <Profile searchParams={searchParams} base={`/u/${session.user.username}`} />;
  }
  const owner = await getUserByUsername(username);
  const friendship = owner ? await getFriendship(session.user.id, owner.id) : null;
  if (!owner || !friendship) notFound();
  return (
    <Profile
      searchParams={searchParams}
      base={`/u/${owner.username}`}
      owner={{ ...owner, friendsSince: friendship.since }}
    />
  );
}
