import Link from "next/link";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { acceptInvite } from "@/lib/friends/actions";
import { areFriends, getInvite } from "@/lib/friends/queries";
import { inviteState } from "@/lib/friends/rules";
import { shownName } from "@/lib/username";
import { AcceptInvite } from "./components/AcceptInvite";

const avatar = "flex size-18 items-center justify-center rounded-full text-section font-bold glass-accent";

function Avatars({ names }: { names: string[] }) {
  return (
    <div className="flex">
      {names.map((n, i) => (
        <div key={n} className={`${avatar} pop ${i > 0 ? "-ml-4 ring-4 ring-bg" : ""}`}>
          {n.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}

function Message({
  title,
  muted,
  detail,
  children,
}: {
  title: ReactNode;
  muted: ReactNode;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex rise flex-col gap-10">
      <div className="flex flex-col gap-6">
        {/* break-words: a 20 letter username must wrap, not run out of the column */}
        <h1 className="text-page leading-none font-bold break-words">
          {title}
          <br />
          <span className="text-muted">{muted}</span>
        </h1>
        {detail && <p className="text-body leading-normal text-muted">{detail}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-4">{children}</div>}
    </div>
  );
}

/**
 * /invite/<code>: who invited you, and one next step. Signed out you sign in right here (`signIn` renders the
 * email step with the invite headline) and the link brings you back to accept.
 */
export async function InviteView({
  code,
  signIn,
}: {
  code: string;
  signIn: (heading: ReactNode, intro: string) => ReactNode;
}) {
  const [inv, session] = await Promise.all([getInvite(code.toLowerCase()), getSession()]);
  if (!inv?.host) {
    return (
      <Message title="This invite" muted="doesn't exist." detail="Check the link, or ask for a new one.">
        <Link href="/" className={buttonStyles("glass", "sm")}>
          Go home
        </Link>
      </Message>
    );
  }
  const host = inv.host;
  const state = inviteState(inv, session?.user.id ?? null, new Date());
  const home = (
    <Link href="/" className={buttonStyles("glass", "sm")}>
      Go home
    </Link>
  );

  let body: ReactNode;
  if (state === "own") {
    body = (
      <Message title="This is your" muted="own invite." detail="Send it to a friend. They add you from here.">
        <Link href="/u/me" className={buttonStyles("glass", "sm")}>
          Your profile
        </Link>
      </Message>
    );
  } else if (state !== "ok") {
    body = (
      <Message title="This invite" muted="ran out." detail={`Invites work for 7 days. Ask ${host} for a new link.`}>
        {home}
      </Message>
    );
  } else if (!session) {
    body = signIn(
      <>
        {host}
        <br />
        invited you.
        <br />
        <span className="text-muted">
          Be friends
          <br />
          on Lateshow.
        </span>
      </>,
      "No password. The link brings you back here.",
    );
  } else {
    const me = shownName(session.user);
    const friendsNow = (
      <div className="flex flex-col gap-10">
        <Avatars names={[host, me]} />
        <Message
          title="You're friends."
          muted={
            <>
              {host}
              <br />
              and {me}.
            </>
          }
        >
          <Link href="/u/me" className={buttonStyles("primary", "sm")}>
            Your profile
          </Link>
          {home}
        </Message>
      </div>
    );
    if (!session.user.username) {
      body = (
        <Message
          title="Pick a username"
          muted="first."
          detail={`${host} sees it, never your email. Then open this link again.`}
        >
          <Link href="/settings" className={buttonStyles("primary", "sm")}>
            Settings
          </Link>
        </Message>
      );
    } else if (await areFriends(session.user.id, inv.userId)) {
      return friendsNow;
    } else {
      body = <AcceptInvite code={inv.code} host={host} accept={acceptInvite} done={friendsNow} />;
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <Avatars names={[host]} />
      {body}
    </div>
  );
}
