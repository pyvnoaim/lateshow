import { Play } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getShowsInProgress } from "@/lib/library/inProgress";
import { getRegion } from "@/lib/region";

/**
 * "Up next" in the top bar: the show you're in the middle of, as one small glass pill. Opens the next episode on
 * your service (or the title page when no service has it). Nothing when you're signed out or caught up.
 */
/** `inMenu`: the phone menu's version, a full width glass row (the pill is tablet and up). */
export async function UpNext({ inMenu = false }: { inMenu?: boolean }) {
  const session = await getSession();
  if (!session) return null;
  const [show] = await getShowsInProgress(session.user.id, 1, (await getRegion()).code);
  if (!show) return null;
  const ep = `S${show.next.season}E${show.next.episode}`;
  const inner = (
    <>
      <Play size={11} fill="currentColor" strokeWidth={0} aria-hidden className="shrink-0" />
      <span className="max-w-40 truncate">{show.name}</span>
      <span className="text-muted nums">{ep}</span>
    </>
  );
  const pill = inMenu
    ? "flex h-12 press items-center gap-2.5 rounded-full px-5 text-label font-medium glass"
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
