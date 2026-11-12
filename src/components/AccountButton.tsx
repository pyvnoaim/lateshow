import Link from "next/link";
import { getSession } from "@/lib/auth";
import { profileHref, shownName } from "@/lib/username";
import { Avatar } from "./Avatar";
import { buttonStyles } from "./ui/button";

/** "Sign in" when signed out, the avatar when signed in. */
export async function AccountButton() {
  const session = await getSession();
  if (!session) {
    return (
      <Link href="/login" className={buttonStyles("glass", "sm")}>
        Sign in
      </Link>
    );
  }
  return (
    <Link
      href={profileHref(session.user)}
      aria-label="Your profile"
      data-tip="Your profile"
      className="press rounded-full"
    >
      <Avatar name={shownName(session.user)} image={session.user.image} size="sm" />
    </Link>
  );
}
