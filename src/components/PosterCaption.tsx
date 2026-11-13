import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { getMyWatchedKeys } from "@/lib/library/queries";
import { getRegion } from "@/lib/region";
import { getMyServiceIds } from "@/lib/settings/queries";
import { getGenreNames, getTitle, img, subscriptionServices, type Card } from "@/lib/tmdb";
import { PosterActions } from "./PosterActions";

/**
 * The grey line under a poster title: "Movie · 2026 · Crime", plus a small app icon
 * when it streams on a subscription in your country, and (signed in, touch screens) the list icon and the watchlist +.
 * Watched it (a series: any episode)? A small icy "verified" badge leads the line, so a row shows it at a glance.
 */
export async function PosterCaption({ card, plus = true }: { card: Card; plus?: boolean }) {
  const year = (card.release_date ?? card.first_air_date ?? "").slice(0, 4);
  const { code: country, lang } = await getRegion();
  // ponytail: one cached title lookup per poster (days, per language). Fine for rows of 12-24, a batch endpoint if TMDB limits bite.
  const [genres, service, seenMap] = await Promise.all([
    getGenreNames(lang).catch(() => ({}) as Record<number, string>),
    Promise.all([getTitle(card.media_type, String(card.id), lang), getMyServiceIds()])
      .then(([t, mine]) => {
        const all = subscriptionServices(t, country);
        return all.find((s) => mine.includes(s.id)) ?? all[0];
      })
      .catch(() => undefined),
    getMyWatchedKeys(),
  ]);
  const seen = seenMap?.get(`${card.media_type}-${card.id}`);
  const seenLabel =
    seen === undefined
      ? ""
      : card.media_type === "movie"
        ? "Watched"
        : `Watched ${seen} episode${seen === 1 ? "" : "s"}`;
  const genre = card.genre_ids?.map((id) => genres[id]).find(Boolean);
  return (
    <span className="-mt-2 flex items-center gap-1.5 text-caption text-muted">
      {seenLabel && (
        <span role="img" aria-label={seenLabel} data-tip={seenLabel} className="flex shrink-0 text-accent">
          {/* filled badge, dark tick: reads as "verified", apart from the watchlist's outline ✓ at the end */}
          <BadgeCheck size={15} strokeWidth={2} fill="currentColor" className="stroke-bg" aria-hidden />
        </span>
      )}
      <span className="truncate">
        {[card.media_type === "tv" ? "Series" : "Movie", year, genre].filter(Boolean).join(" · ")}
      </span>
      {service && (
        <Image
          src={img(service.logoPath, "w92")!}
          alt={`On ${service.name}`}
          data-tip={service.name}
          width={14}
          height={14}
          className="size-3.5 shrink-0 rounded-sm"
        />
      )}
      {plus && (
        // touch screens: the actions sit here. With a mouse they float over the poster on hover (PosterLink)
        <span className="ml-auto flex items-center gap-2.5 pl-1 pointer-fine:hidden">
          <PosterActions card={card} variant="caption" />
        </span>
      )}
    </span>
  );
}
