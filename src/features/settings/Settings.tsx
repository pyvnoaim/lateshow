import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/button";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
import { getRegion } from "@/lib/region";
import { deleteAccount, setLanguage, setMyService, setSpoilerGuard, setUsername } from "@/lib/settings/actions";
import { getMyServiceIds, getSpoilerGuard } from "@/lib/settings/queries";
import { getServiceChoices, img } from "@/lib/tmdb";
import { ChoicePicker } from "./components/ChoicePicker";
import { DeleteAccount } from "./components/DeleteAccount";
import { TextSetting } from "./components/TextSetting";
import { ServicePicker } from "./components/ServicePicker";

export async function Settings() {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/settings")}`);
  const region = await getRegion();
  const [choices, mine, guard] = await Promise.all([
    getServiceChoices(region.code).catch(() => []),
    getMyServiceIds(),
    getSpoilerGuard(),
  ]);

  return (
    <div className="flex flex-col gap-section">
      <h1 className="rise text-page leading-none font-bold">Settings</h1>
      <Section title="Username" description="The name everyone sees, and your profile's address.">
        <TextSetting
          id="username"
          label="Username"
          prefix="@"
          placeholder="pick a username"
          initial={session.user.username ?? ""}
          save={setUsername}
          maxLength={21}
        />
      </Section>
      <Section
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
      </Section>
      <Section
        title="Language"
        description="For titles, descriptions and posters. The rest of Lateshow stays in English."
      >
        <ChoicePicker
          label="Language"
          choices={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          current={region.lang}
          save={setLanguage}
        />
      </Section>
      <Section
        title="Spoilers"
        description="Episode titles can give the story away. Hide the ones you haven't watched."
      >
        <ChoicePicker
          label="Episode titles"
          choices={[
            { value: "show", label: "Show episode titles" },
            { value: "hide", label: "Hide until watched" },
          ]}
          current={guard ? "hide" : "show"}
          save={setSpoilerGuard}
        />
      </Section>
      <Section title="Your data" description="Everything you track, as a spreadsheet. Or remove it all.">
        <DeleteAccount remove={deleteAccount}>
          {/* a plain link: the browser downloads the file */}
          <a href="/api/export" download className={buttonStyles("glass", "sm")}>
            Download CSV
          </a>
        </DeleteAccount>
      </Section>
    </div>
  );
}
