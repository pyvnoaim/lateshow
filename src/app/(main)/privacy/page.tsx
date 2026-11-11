import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { HOSTING, OPERATOR, PRIVACY_UPDATED } from "@/lib/legal";

export const metadata = { title: "Privacy · Lateshow" };

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-section leading-none font-bold">{title}</h2>
      <div className="flex flex-col gap-4 text-body leading-relaxed text-muted">{children}</div>
    </section>
  );
}

// GDPR Art. 13. Keep this in step with the code: what is stored (src/lib/db), which cookies exist, who else gets data.
export default function PrivacyPage() {
  return (
    <Container as="main" size="narrow" className="flex flex-col gap-section pt-page-top">
      <div className="flex flex-col gap-4">
        <h1 className="text-page leading-none font-bold">Privacy</h1>
        <p className="text-body leading-relaxed text-muted">
          No ads. No tracking. No analytics. Nothing is sold.
          <br />
          This page says exactly what Lateshow keeps, and why.
        </p>
        <p className="text-small text-muted">Last changed {PRIVACY_UPDATED}.</p>
      </div>

      <Part title="Who is responsible">
        <p>
          <strong>{OPERATOR.name}</strong>, {OPERATOR.co}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}.
          <br />
          Email: {OPERATOR.email}. Also see the{" "}
          <Link href="/impressum" className="text-fg hover:underline">
            Impressum
          </Link>
          .
        </p>
      </Part>

      <Part title="Without an account">
        <p>
          You can browse, search and open every title without signing in. Lateshow keeps nothing about you for that.
        </p>
        <p>
          <strong>Your country</strong> is read from a header our network (Cloudflare) adds to each request, so you see
          the streaming services where you are. It is used for that page and not stored.
        </p>
        <p>
          <strong>Joining a room as a guest</strong> stores the name you type and a random id that your browser keeps in
          a cookie. It is deleted with the room.
        </p>
      </Part>

      <Part title="With an account">
        <p>We keep what the features need, and nothing else:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Your email address</strong>, to send you sign-in links. Nobody else sees it.
          </li>
          <li>
            <strong>Your username</strong>, which friends and people in your rooms see.
          </li>
          <li>
            <strong>Sign-in sessions</strong>, with the IP address and browser they started from, so your login is safe.
            A session ends after 7 days without use, or when you sign out.
          </li>
          <li>
            <strong>What you track</strong>: what you watched and when, your watchlist, your streaming services and your
            settings.
          </li>
          <li>
            <strong>Friends</strong>: who you are friends with and the invite links you made.
          </li>
          <li>
            <strong>Rooms</strong>: who was in a room and how they voted. Rooms close after 12 hours and are deleted a
            day later.
          </li>
        </ul>
        <p>
          Legal basis: providing the service you signed up for (Art. 6 (1) (b) GDPR). Friends see your history,
          watchlist and stats only if you allow it in Settings (on by default, one switch to turn it off).
        </p>
        <p>
          We keep this until you delete your account. Delete it any time in{" "}
          <Link href="/settings" className="text-fg hover:underline">
            Settings
          </Link>
          , and it is gone at once, nothing kept.
        </p>
      </Part>

      <Part title="Cookies">
        <p>Lateshow only sets cookies it needs to work. No tracking, so no cookie banner (§ 25 (2) TDDDG).</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>better-auth.session_token</strong> keeps you signed in. Up to 7 days.
          </li>
          <li>
            <strong>lang</strong> remembers the language you picked. 1 year.
          </li>
          <li>
            <strong>spoilers</strong> remembers whether episode titles stay hidden. 1 year.
          </li>
          <li>
            <strong>room_guest</strong> remembers you when you join a room as a guest. 30 days.
          </li>
        </ul>
      </Part>

      <Part title="Other services">
        <p>
          <strong>Hosting</strong>: {HOSTING.provider}. The web server keeps access logs (IP address, time, page) for{" "}
          {HOSTING.logDays} days to keep the site safe (Art. 6 (1) (f) GDPR).
        </p>
        <p>
          <strong>Cloudflare</strong> (Cloudflare, Inc., USA) runs our domain and network. Every request passes through
          it, so it sees your IP address. Cloudflare takes part in the EU-US Data Privacy Framework.
        </p>
        <p>
          <strong>TMDB and JustWatch</strong> provide titles, posters and streaming offers. Our server asks them, your
          browser never does, so they don&apos;t see who you are.
        </p>
        <p>
          <strong>YouTube</strong> plays trailers. Nothing loads until you press Trailer. Then the video comes from
          youtube-nocookie.com (Google Ireland Ltd.), which sees your IP address.
        </p>
        <p>
          <strong>Sign-in emails</strong> are sent through [EMAIL PROVIDER, NAME AND COUNTRY], which sees your email
          address and the link.
        </p>
        <p>Watch on links open the streaming service. What happens there is up to that service.</p>
      </Part>

      <Part title="Your rights">
        <p>You can ask what we keep about you, have it corrected or deleted, and object to how it is used.</p>
        <p>
          Most of it you can do yourself: download everything you track as a spreadsheet, or delete your account, in{" "}
          <Link href="/settings" className="text-fg hover:underline">
            Settings
          </Link>
          . For anything else, write to {OPERATOR.email}.
        </p>
        <p>
          You can also complain to a data protection authority, for example the one in the German state where you live.
        </p>
      </Part>
    </Container>
  );
}
