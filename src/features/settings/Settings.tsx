import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
import { shownName } from "@/lib/username";
import { getRegion } from "@/lib/region";
import {
  deleteAccount,
  newCalendarLink,
  setAvatar,
  setLanguage,
  setMyService,
  setShareActivity,
  setSpoilerGuard,
  setUsername,
  removePasskey,
} from "@/lib/settings/actions";
import { getMyPasskeys, getMyServiceIds, getSpoilerGuard } from "@/lib/settings/queries";
import { getServiceChoices, img } from "@/lib/tmdb";
import { calendarUrl } from "./calendarFeed";
import { AvatarPicker } from "./components/AvatarPicker";
import { CalendarLink } from "./components/CalendarLink";
import { ChoicePicker } from "./components/ChoicePicker";
import { DeleteAccount } from "./components/DeleteAccount";
import { ImportHistory } from "./components/ImportHistory";
import { TextSetting } from "./components/TextSetting";
import { Passkeys } from "./components/Passkeys";
import { ServicePicker } from "./components/ServicePicker";
import { SettingsNav } from "./components/SettingsNav";

export async function Settings() {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/settings")}`);
  const region = await getRegion();
  const [choices, mine, guard, passkeys] = await Promise.all([
    getServiceChoices(region.code).catch(() => []),
    getMyServiceIds(),
    getSpoilerGuard(),
    getMyPasskeys(),
  ]);

  return (
    <div className="flex justify-center gap-section">
      <SettingsNav groups={GROUPS} />
      <div className="flex max-w-reading min-w-0 flex-1 flex-col gap-section">
        <h1 className="rise text-page leading-none font-bold">Settings</h1>
        <Group {...GROUPS[0]}>
          <Row title="Username" description="Everyone sees it. It's also your profile's address.">
            <TextSetting
              id="username"
              label="Username"
              prefix="@"
              placeholder="pick a username"
              initial={session.user.username ?? ""}
              save={setUsername}
              maxLength={21}
            />
          </Row>
          <Row title="Picture">
            <AvatarPicker name={shownName(session.user)} current={session.user.image ?? null} save={setAvatar} />
          </Row>
          <Row title="Friends see" description="Off, they only see your name.">
            <ChoicePicker
              label="Share with friends"
              choices={[
                { value: "share", label: "My activity" },
                { value: "private", label: "Only my name" },
              ]}
              current={session.user.shareActivity === false ? "private" : "share"}
              save={setShareActivity}
            />
          </Row>
        </Group>
        <Group {...GROUPS[1]}>
          <Row
            stack
            title="Your services"
            description={`The ones you pay for in ${region.name}. Trending gets a My services tab and picks come only from these.`}
          >
            {choices.length === 0 ? (
              <p className="text-body text-muted">Couldn&apos;t load the services right now. Try again in a minute.</p>
            ) : (
              <ServicePicker
                choices={choices.map((s) => ({ ...s, logo: img(s.logoPath, "w92")! }))}
                initial={mine}
                save={setMyService}
              />
            )}
          </Row>
          <Row title="Language" description="For titles, descriptions and posters. The rest stays in English.">
            <ChoicePicker
              label="Language"
              choices={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
              current={region.lang}
              save={setLanguage}
            />
          </Row>
          <Row title="Episode titles" description="They can give the story away.">
            <ChoicePicker
              label="Episode titles"
              choices={[
                { value: "show", label: "Show" },
                { value: "hide", label: "Hide until watched" },
              ]}
              current={guard ? "hide" : "show"}
              save={setSpoilerGuard}
            />
          </Row>
          <Row
            stack
            title="Calendar"
            description="New episodes and release days from your list, in Apple or Google Calendar. Anyone with this link sees your schedule."
          >
            <CalendarLink url={await calendarUrl(session.user.id)} renew={newCalendarLink} />
          </Row>
        </Group>
        <Group {...GROUPS[2]}>
          <Row stack title="Sign-in">
            <Passkeys
              email={session.user.email}
              keys={passkeys.map((k) => ({
                id: k.id,
                name: k.name,
                added: k.createdAt
                  ? k.createdAt.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: k.createdAt.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
                    })
                  : "a while ago",
              }))}
              remove={removePasskey}
            />
          </Row>
          <Row stack title="Import" description="Bring your history from Letterboxd or IMDb.">
            <ImportHistory />
          </Row>
          <Row title="Your data" description="Everything you track, as a spreadsheet. Or remove it all.">
            <DeleteAccount remove={deleteAccount}>
              {/* a plain link: the browser downloads the file */}
              <a href="/api/export" download className={buttonStyles("glass", "sm")}>
                Download CSV
              </a>
            </DeleteAccount>
          </Row>
        </Group>
      </div>
    </div>
  );
}

const GROUPS = [
  { id: "profile", title: "Profile" },
  { id: "watching", title: "Watching" },
  { id: "account", title: "Account" },
] as const;

/** One of the three groups: a title the side nav links to, its rows below with even air between them. */
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-page-top flex-col gap-12">
      <h2 id={`${id}-title`} className="text-section font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * One setting: label and a muted line on the left, the control on the right (from lg).
 * `stack` puts wide controls (service tiles, lists, the calendar link) under the label instead.
 */
function Row({
  title,
  description,
  stack,
  children,
}: {
  title: string;
  description?: string;
  stack?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-4 ${stack ? "" : "lg:flex-row lg:gap-8"}`}>
      <div className={`flex flex-col gap-1 ${stack ? "max-w-form" : "lg:w-setting-label lg:shrink-0"}`}>
        <h3 className="text-body font-semibold">{title}</h3>
        {description && <p className="text-label text-pretty text-muted">{description}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
