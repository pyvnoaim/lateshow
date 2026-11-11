import { Play } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getShowsInProgress } from "@/lib/library/inProgress";
import { getRegion } from "@/lib/region";

/**
 * "Up next" in the top bar: the show you're in the middle of, as one small glass pill. Opens the next episode on
 * your service (or the title page when no service has it). Nothing when you're signed out or caught up.
 */
/** `compact` (the scroll island): just ▶ and the episode, the title is in the tooltip. */
export async function UpNext({ compact = false }: { compact?: boolean }) {
  const session = await getSession();
  if (!session) return null;
  const [show] = await getShowsInProgress(session.user.id, 1, (await getRegion()).code);
  if (!show) return null;
  const ep = `S${show.next.season}E${show.next.episode}`;
  const inner = (
    <>
      <Play size={11} fill="currentColor" strokeWidth={0} aria-hidden className="shrink-0" />
      {!compact && <span className="max-w-40 truncate">{show.name}</span>}
      <span className="text-muted nums">{ep}</span>
    </>
  );
  const pill = compact
    ? "hidden h-9 press items-center gap-2 rounded-full bg-fg/8 pr-3.5 pl-3 text-small font-medium transition-colors hover:bg-fg/14 md:flex"
    : "hidden h-9 press items-center gap-2 rounded-full pr-4 pl-3.5 text-small font-medium glass md:flex";
  return show.link ? (
    <a
      href={show.link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Continue ${show.name}, ${ep} on ${show.link.service}`}
      data-tip={`Continue ${show.name}`}
      data-tip-meta={`${ep} on ${show.link.service}`}
      className={pill}
    >
      {inner}
    </a>
  ) : (
    <Link
      href={`/title/tv/${show.id}`}
      aria-label={`Continue ${show.name}, ${ep}`}
      data-tip="Continue"
      className={pill}
    >
      {inner}
    </Link>
  );
}
