import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { getWatchLinks } from "@/lib/justwatch";
import { getLanguage } from "@/lib/region";
import { playAgain } from "@/lib/rooms/actions";
import type { getRoom } from "@/lib/rooms/queries";
import { getEnglishName, getTitle, img } from "@/lib/tmdb";
import { PlayAgain } from "./components/RoomButtons";

export type Room = NonNullable<Awaited<ReturnType<typeof getRoom>>>;

/** The end of any game: the poster, a headline, Watch on, and Play again for the host. */
export async function Winner({
  r,
  host,
  detail,
  headline,
}: {
  r: Room;
  host: boolean;
  detail: string;
  /** Two lines, the second muted. Gets the title's name. */
  headline: (name: string) => [ReactNode, ReactNode];
}) {
  const t = await getTitle(r.kind, String(r.winner), await getLanguage());
  const english = await getEnglishName(r.kind, t.id).catch(() => t.title ?? t.name ?? "");
  const links = await getWatchLinks(r.kind, t.id, english, r.country ?? "DE");
  const link = links.find((l) => l.included) ?? links[0];
  const [top, muted] = headline(t.title ?? t.name ?? "");
  return (
    <div className="flex flex-col gap-10 sm:flex-row sm:items-center sm:gap-14">
      <div className="relative aspect-poster w-40 shrink-0 pop overflow-hidden rounded-banner bg-raised shadow-2xl sm:w-72">
        {t.poster_path && (
          <Image src={img(t.poster_path, "w780")!} alt="" fill sizes="320px" className="object-cover" />
        )}
      </div>
      <div className="flex rise flex-col gap-6">
        <span className="text-label text-muted">{detail}</span>
        <h1 className="text-page leading-none font-bold break-words">
          {top}
          <br />
          <span className="text-muted">{muted}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {link && (
            <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary", "md")}>
              {link.included ? "Watch" : "Rent or buy"} on {link.service}
              <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
            </a>
          )}
          {host && <PlayAgain code={r.code} again={playAgain} />}
        </div>
      </div>
    </div>
  );
}
