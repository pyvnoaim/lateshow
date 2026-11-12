import "server-only";
import type { Metadata } from "next";
import { getRegion } from "@/lib/region";
import { getTitle } from "@/lib/tmdb";

/** Cuts at a word boundary and adds "…", for link preview descriptions. Pure. */
export function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).trimEnd()}…`;
}

/** Title, year and overview for a title page's tab and link previews (Discord, iMessage, WhatsApp). */
export async function titleMetadata(type: string, id: string): Promise<Metadata> {
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) return {};
  const { lang } = await getRegion();
  const t = await getTitle(type, id, lang).catch(() => null);
  if (!t) return {};
  const name = t.title ?? t.name ?? "";
  const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
  const title = year ? `${name} (${year})` : name;
  const description = clip(t.overview, 200);
  // the preview image is opengraph-image.tsx next to the page (rendered on our server, so viewers never talk to TMDB)
  return {
    title: `${title} · Lateshow`,
    description,
    openGraph: {
      title,
      description,
      siteName: "Lateshow",
      type: type === "movie" ? "video.movie" : "video.tv_show",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
