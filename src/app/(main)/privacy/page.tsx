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
            <strong>Your email address</strong>, to send you sign-in codes. Nobody else sees it.
          </li>
          <li>
            <strong>Passkeys</strong>, if you save one: its public half and what kind of device holds it. The private
            half never leaves your device.
          </li>
          <li>
            <strong>Your username</strong>, which friends and people in your rooms see.
          </li>
          <li>
            <strong>Your profile picture color</strong>, which friends and people in your rooms see.
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
            <strong>Imports</strong>: which service each import came from and when, so you can remove one again, and the
            streaming site&apos;s own ids of titles you matched, so the next import finds them without searching. The
            export file itself never leaves your browser, only the rows read from it.
          </li>
          <li>
            <strong>The Lateshow extension</strong> (Firefox and Chrome), if you connect it: a key for that browser (we
            keep only a fingerprint of it), which browser it is and when it was last used. It works only on Netflix,
            Prime Video and Crunchyroll, signed in there as you, and reads only their own data:
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
              <li>
                When you finish an episode or film there, it sends that title with the time and the service. Your
                progress, pauses or what you started but didn&apos;t finish stay in your browser.
              </li>
              <li>
                Only while you watch in sync in a Plus one room (Watch in sync, until you stop or the room closes): when
                you play, pause or skip on Netflix, it sends whether it plays, where in the episode and which episode.
                Only the people in that room see it, with your username. It&apos;s kept with the room and deleted a day
                after the room closes.
              </li>
              <li>
                When you press Sync (or Import on a history page), it sends that site&apos;s watch history since the
                last sync (titles, seasons, episodes, days) and, unless you switch it off, the titles on its watchlist.
              </li>
            </ul>
            It reads no other site, no browsing history and no passwords, and sends nothing to anyone but Lateshow. What
            it sends is used only for your Lateshow library, never sold, shared or used for ads. Disconnect it any time
            in Settings, and remove an import there.
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
            <strong>__Secure-better-auth.session_token</strong> keeps you signed in. Up to 7 days.
          </li>
          <li>
            <strong>lang</strong> remembers the language you picked. 1 year.
          </li>
          <li>
            <strong>room_guest</strong> remembers you when you join a room as a guest. 30 days.
          </li>
          <li>
            <strong>lateshow:passkey</strong> and <strong>lateshow:passkey-no</strong> (kept in your browser, never
            sent) remember whether this device has a passkey or you said Not now. Until you clear your browser data.
          </li>
        </ul>
      </Part>

      <Part title="Other services">
        <p>
          <strong>Hosting</strong>: {HOSTING.provider}. The web server keeps access logs (IP address, time, page) for up
          to {HOSTING.logDays} days to keep the site safe (Art. 6 (1) (f) GDPR).
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
          <strong>Sign-in emails</strong> are sent through Resend (Resend, Inc., USA) from servers in the EU (Ireland).
          Resend sees your email address and the code.
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
