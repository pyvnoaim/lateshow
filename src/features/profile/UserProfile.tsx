import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Profile } from "./Profile";

/**
 * /u/[username]. For now only your own: anyone else's is a 404, so usernames can't be probed.
 * ponytail: friends' profiles come with friendships (step 3 of the friends plan in CLAUDE.md).
 */
export async function UserProfile({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ username }, session] = await Promise.all([params, getSession()]);
  if (!session?.user.username || session.user.username !== username.toLowerCase()) notFound();
  return <Profile searchParams={searchParams} base={`/u/${session.user.username}`} />;
}
