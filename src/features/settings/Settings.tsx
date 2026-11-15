import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
import { shownName } from "@/lib/username";
import { getRegion } from "@/lib/region";
import {
  deleteAccount,
  setAvatar,
  setLanguage,
  setMyService,
  setShareActivity,
  setUsername,
  removePasskey,
  renamePasskey,
} from "@/lib/settings/actions";
import { getMyPasskeys, getMyServiceIds } from "@/lib/settings/queries";
import { getServiceChoices, img } from "@/lib/tmdb";
import { AvatarPicker } from "./components/AvatarPicker";
import { LanguagePicker } from "./components/LanguagePicker";
import { DeleteAccount } from "./components/DeleteAccount";
import { ImportHistory } from "./components/ImportHistory";
import { PastImports } from "./components/PastImports";
import { ExtensionKeys } from "./components/ExtensionKeys";
import { getKeys } from "@/lib/extension/keys";
import { connectExtension, disconnectExtension } from "@/lib/extension/actions";
import { latestExtension } from "@/lib/extension/latest";
import { getImports, getOpenPicks } from "@/lib/library/queries";
import { removeImport } from "@/lib/library/importActions";
import { TextSetting } from "./components/TextSetting";
import { Passkeys } from "./components/Passkeys";
import { ServicePicker } from "./components/ServicePicker";
import { Toggle } from "./components/Toggle";
import { SettingsNav } from "./components/SettingsNav";

export async function Settings() {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/settings")}`);
  const region = await getRegion();
  const [choices, mine, passkeys, imports, keys, waiting, latest] = await Promise.all([
    getServiceChoices(region.code).catch(() => []),
    getMyServiceIds(),
    getMyPasskeys(),
    getImports(session.user.id),
    getKeys(session.user.id),
    getOpenPicks(session.user.id),
    latestExtension(),
  ]);
  const day = (d: Date) =>
    d.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });

  return (
    <div className="flex justify-center gap-section">
      <SettingsNav groups={GROUPS} />
      <div className="flex max-w-reading min-w-0 flex-1 flex-col gap-section">
        <h1 className="rise text-page leading-none font-bold">Settings</h1>
        <Group {...GROUPS[0]}>
          <Row title="Username" description="Your name and profile address.">
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
          <Row title="Share with friends" description="Your history, ratings and lists.">
            <Toggle label="Share with friends" on={session.user.shareActivity !== false} save={setShareActivity} />
          </Row>
        </Group>
        <Group {...GROUPS[1]}>
          <Row stack title="Your services" description={`Picks come only from the ones you pay for.`}>
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
          <Row title="Language" description="For titles, descriptions and posters.">
            <LanguagePicker choices={LANGUAGES} current={region.lang} save={setLanguage} />
          </Row>
        </Group>
        <Group {...GROUPS[2]}>
          <Row title="Email" description="Sign-in codes go here.">
            <p className="text-body">{session.user.email}</p>
          </Row>
          <Row title="Passkeys" description="Sign in with Face ID, Touch ID or your password manager. No codes.">
            <Passkeys
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
              rename={renamePasskey}
            />
          </Row>
          <Row
            title="Import"
            description={
              <>
                Your history from <Source name="Letterboxd" where="Settings › Data › Export your data" file="ZIP" />,{" "}
                <Source name="IMDb" where="Your ratings or Watchlist › ⋯ › Export" file="CSV" />,{" "}
                <Source
                  name="Netflix"
                  where="The Lateshow extension, on your Netflix viewing activity"
                  meta="Or its CSV (Viewing activity › Download all), dropped here"
                />
                ,{" "}
                <Source
                  name="Prime Video"
                  where="The Lateshow extension, on your Prime Video watch history"
                  meta="Or the Watch History Exporter's CSV, dropped here"
                />{" "}
                or{" "}
                <Source
                  name="Crunchyroll"
                  where="The Lateshow extension, on crunchyroll.com/history"
                  meta="No file needed, it reads your history there"
                />
                .
              </>
            }
          >
            <div className="flex flex-col items-start gap-8">
              <ImportHistory waiting={waiting}>
                <PastImports
                  imports={imports.map((i) => ({
                    id: i.id,
                    source: i.source,
                    when: i.createdAt.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: i.createdAt.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
                    }),
                    watches: i.watches,
                    listed: i.listed,
                    titles: i.titles,
                    posters: i.posters.map((p) => img(p, "w92")!),
                  }))}
                  remove={removeImport}
                />
              </ImportHistory>
            </div>
          </Row>
          <Row
            title="Extension"
            description="Brings your history from Netflix, Prime Video and Crunchyroll and marks what you finish."
          >
            <ExtensionKeys
              connected={keys.map((k) => ({
                id: k.id,
                created: day(k.createdAt),
                used: k.usedAt ? day(k.usedAt) : null,
                browser: k.browser,
              }))}
              latest={latest}
              connect={connectExtension}
              disconnect={disconnectExtension}
            />
          </Row>
          <Row title="Your data" description="Download or delete everything.">
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
 * `stack` puts wide controls (service tiles, lists) under the label instead.
 */
/** A service the import reads, lit up, with where to download its export as the tooltip (hover or Tab). */
const Source = ({ name, where, file, meta }: { name: string; where: string; file?: string; meta?: string }) => (
  <span
    tabIndex={0}
    data-tip={where}
    data-tip-meta={meta ?? `Then drop the ${file} here`}
    className="cursor-help text-fg"
  >
    {name}
  </span>
);

function Row({
  title,
  description,
  stack,
  children,
}: {
  title: string;
  description?: ReactNode;
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

/** Shaped like the page (heading, then label and control rows), so the switch in isn't a black page. */
export function SettingsSkeleton() {
  return (
    <div className="flex justify-center gap-section">
      <div className="flex max-w-reading min-w-0 flex-1 flex-col gap-section">
        <div className="h-16 w-56 sk rounded-poster" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="h-5 w-32 sk rounded-full" />
              <div className="h-4 w-48 sk rounded-full" />
            </div>
            <div className="h-10 w-40 sk rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
