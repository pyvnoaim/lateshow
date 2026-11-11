import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { continueOnDevice } from "@/lib/rooms/actions";
import { handoffOwner } from "@/lib/rooms/handoff";
import { safeNext } from "@/lib/safeNext";

/**
 * The page the lobby's QR opens on a phone: "Continue as @name?". Nothing happens until you confirm, so a link
 * someone sends you can't quietly sign you into their account. Already signed in here: straight to the room.
 */
export async function Handoff({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const token = typeof params.t === "string" ? params.t : "";
  if (await getSession()) redirect(next);
  const owner = await handoffOwner(token);
  if (!owner) {
    return (
      <div className="flex rise flex-col gap-10">
        <h1 className="text-page leading-none font-bold">
          This code
          <br />
          <span className="text-muted">ran out.</span>
        </h1>
        <p className="text-body leading-normal text-muted">
          Codes work once, for 2 minutes. Scan the new one on the other screen.
        </p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={`${buttonStyles("glass", "sm")} w-fit`}>
          Sign in instead
        </Link>
      </div>
    );
  }
  return (
    <div className="flex rise flex-col gap-10">
      <div className="flex flex-col gap-6">
        <h1 className="text-page leading-none font-bold break-words">
          Continue as
          <br />
          <span className="text-muted">{owner}?</span>
        </h1>
        <p className="text-body leading-normal text-muted">
          This phone signs in to your account
          <br />
          and opens the room.
        </p>
      </div>
      <form action={continueOnDevice} className="flex items-center gap-6">
        <input type="hidden" name="t" value={token} />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={buttonStyles("primary", "sm")}>
          Continue
        </button>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonStyles("text", "text")}>
          Not me
        </Link>
      </form>
    </div>
  );
}
