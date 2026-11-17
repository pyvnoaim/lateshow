import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { buttonStyles } from "@/components/ui/button";
import { getWatchLinks } from "@/lib/justwatch";
import { getLanguage } from "@/lib/region";
import { playAgain, setControl } from "@/lib/rooms/actions";
import type { getRoom } from "@/lib/rooms/queries";
import { getSeasonInfo } from "@/lib/library/inProgress";
import { nextEpisode, parseEpisodeKeys } from "@/lib/library/progress";
import { getTitleLibrary } from "@/lib/library/queries";
import { getEnglishName, getTitle, img, titleMeta, type Title } from "@/lib/tmdb";
import { Scramble } from "./components/Scramble";
import { PlusOnePanel } from "./components/PlusOnePanel";
import { PlayAgain } from "./components/RoomButtons";

export type Room = NonNullable<Awaited<ReturnType<typeof getRoom>>>;

/**
 * The end of any game: the poster, who's in, a small eyebrow, the title large, Watch on, Play again for the host,
 * then watching it in sync when it's on Netflix. Phones get it centered with full-width buttons.
 */
export async function Winner({
  r,
  host,
  eyebrow,
  detail,
}: {
  r: Room;
  host: boolean;
  /** "It's a match", in the accent above the title */
  eyebrow: string;
  /** beside the faces: "All 3 of you said yes" */
  detail: string;
}) {
  const lang = await getLanguage();
  const t = await getTitle(r.kind, String(r.winner), lang);
  const english = await getEnglishName(r.kind, t.id).catch(() => t.title ?? t.name ?? "");
  const links = await getWatchLinks(r.kind, t.id, english, r.country ?? "DE");
  const link = links.find((l) => l.included) ?? links[0];
  const name = t.title ?? t.name ?? "";
  const netflix = await netflixTarget(
    r,
    t,
    links.find((l) => l.service === "Netflix"),
    lang,
  );
  const meta = [r.kind === "movie" ? "Movie" : "Series", titleMeta(t, r.kind)].filter(Boolean).join(" · ");
  const members = r.members.filter((m) => m.joined);
  return (
    <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-center sm:gap-16 sm:text-left">
      <div className="relative aspect-poster w-56 shrink-0 pop overflow-hidden rounded-banner bg-raised shadow-2xl sm:w-80">
        {t.poster_path && (
          <Image src={img(t.poster_path, "w780")!} alt="" fill sizes="320px" className="object-cover" />
        )}
      </div>
      <div className="flex w-full rise flex-col items-center gap-8 sm:items-start">
        <div className="flex items-center gap-3">
          <div className="flex">
            {members.map((m, i) => (
              <Avatar
                key={m.memberId}
                name={m.name}
                image={m.image}
                size="sm"
                className={i > 0 ? "-ml-2 ring-2 ring-bg" : "ring-2 ring-bg"}
              />
            ))}
          </div>
          <span className="text-label text-muted">{detail}</span>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-label font-semibold text-accent">{eyebrow}</span>
          <h1 className="text-page leading-none font-bold text-balance break-words">
            <Scramble text={name} />
          </h1>
          {meta && <span className="text-body text-muted">{meta}</span>}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          {link && (
            <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary", "md")}>
              {link.included ? "Watch" : "Rent or buy"} on {link.service}
              <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
            </a>
          )}
          {host && r.game !== "plusone" && <PlayAgain code={r.code} again={playAgain} />}
        </div>
        {netflix && (
          <PlusOnePanel code={r.code} host={host} control={r.control} setControl={setControl} netflix={netflix} />
        )}
      </div>
    </div>
  );
}

/**
 * Plus one's "Open on Netflix": the title's Netflix id (JustWatch links to netflix.com/title/<id>) and, for a show,
 * the episode: where the room plays, else the room maker's next one, else the first. The extension finds it there.
 */
async function netflixTarget(r: Room, t: Title, link: { service: string; url: string } | undefined, lang: string) {
  const id =
    link?.service === "Netflix" ? /netflix\.com\/(?:[a-z-]+\/)?(?:title|watch)\/(\d+)/.exec(link.url)?.[1] : null;
  if (!id) return null;
  if (r.kind === "movie") return { id };
  if (r.playback?.season != null && r.playback.episode != null)
    return { id, season: r.playback.season, episode: r.playback.episode };
  const seasons = await getSeasonInfo(t, lang);
  const { watched } = await getTitleLibrary(r.hostId, "tv", t.id);
  const next = watched.length ? nextEpisode(seasons, parseEpisodeKeys(watched)) : null;
  const first = seasons[0] ? { season: seasons[0].number, episode: seasons[0].episodes[0] } : null;
  return { id, ...(next ?? first) };
}
