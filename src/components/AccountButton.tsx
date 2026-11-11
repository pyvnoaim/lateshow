import Link from "next/link";
import { getSession } from "@/lib/auth";
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
  const initial = (session.user.name || session.user.email).charAt(0).toUpperCase();
  return (
    <Link
      href="/u/me"
      aria-label="Your profile"
      data-tip="Your profile"
      className="flex size-8 press items-center justify-center rounded-full text-small font-semibold glass-accent"
    >
      {initial}
    </Link>
  );
}
