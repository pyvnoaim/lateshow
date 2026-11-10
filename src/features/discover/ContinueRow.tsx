import { ShowProgressCard } from "@/components/library/ShowProgressCard";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { getShowsInProgress } from "./inProgress";

/** Your other shows in progress. The first one is already the hero, so it starts at the second. */
export async function ContinueRow() {
  const session = await getSession();
  if (!session) return null;
  const shows = (await getShowsInProgress(session.user.id, 7)).slice(1);
  if (shows.length === 0) return null;
  return (
    <Section title="Continue watching">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shows.slice(0, 6).map((s) => (
          <ShowProgressCard
            key={s.id}
            id={s.id}
            name={s.name}
            backdropPath={s.backdropPath}
            nextLabel={`Next S${s.next.season} E${s.next.episode}`}
            percent={s.percent}
          />
        ))}
      </div>
    </Section>
  );
}
