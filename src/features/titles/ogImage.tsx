import "server-only";
import { ImageResponse } from "next/og";
import { getRegion } from "@/lib/region";
import { getTitle, img } from "@/lib/tmdb";

export const ogSize = { width: 1200, height: 630 };

/** Link preview for a title: poster left, name and "Type · Year" right, on the site's black. Default font. */
export async function titleOgImage(type: string, id: string) {
  const ok = (type === "movie" || type === "tv") && /^\d+$/.test(id);
  const { lang } = await getRegion();
  const t = ok ? await getTitle(type, id, lang).catch(() => null) : null;
  const name = t?.title ?? t?.name ?? "Lateshow";
  const year = (t?.release_date ?? t?.first_air_date ?? "").slice(0, 4);
  const meta = t ? [type === "tv" ? "Series" : "Movie", year].filter(Boolean).join(" · ") : "";
  const poster = img(t?.poster_path, "w500");
  // colors are --color-bg, --color-fg, --color-muted from globals.css
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#000000", padding: 60, gap: 60 }}>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} width={340} height={510} style={{ borderRadius: 16, objectFit: "cover" }} alt="" />
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 20 }}>
        <div style={{ fontSize: name.length > 30 ? 56 : 76, fontWeight: 700, color: "#f5f5f7", lineHeight: 1.05 }}>
          {name}
        </div>
        {meta && <div style={{ fontSize: 36, color: "#86868b" }}>{meta}</div>}
      </div>
      <div style={{ position: "absolute", right: 60, bottom: 50, fontSize: 28, color: "#86868b" }}>Lateshow</div>
    </div>,
    ogSize,
  );
}
