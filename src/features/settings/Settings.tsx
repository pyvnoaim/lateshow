import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { getRegion } from "@/lib/region";
import { setLanguage, setMyService } from "@/lib/settings/actions";
import { getMyServiceIds } from "@/lib/settings/queries";
import { getServiceChoices, img } from "@/lib/tmdb";
import { LanguagePicker } from "./components/LanguagePicker";
import { ServicePicker } from "./components/ServicePicker";

export async function Settings() {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/settings")}`);
  const region = await getRegion();
  const [choices, mine] = await Promise.all([getServiceChoices(region.code).catch(() => []), getMyServiceIds()]);

  return (
    <div className="flex flex-col gap-section">
      <h1 className="rise text-page leading-none font-bold">Settings</h1>
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
        <LanguagePicker current={region.lang} save={setLanguage} />
      </Section>
    </div>
  );
}
