import Image from "next/image";
import { parseAvatar, photoUrl, type Tone } from "@/lib/avatar";

const SIZES = {
  xs: { box: "size-5 text-badge", px: 20 },
  sm: { box: "size-8 text-small", px: 32 },
  md: { box: "size-12 text-body", px: 48 },
  lg: { box: "size-16 text-section", px: 64 },
  xl: { box: "size-18 text-section", px: 72 },
} as const;

// written out in full so Tailwind finds them. icy is the accent itself.
export const TONE_CLASS: Record<Tone, string> = {
  icy: "",
  lavender: "tone-lavender",
  mint: "tone-mint",
  peach: "tone-peach",
  rose: "tone-rose",
  sand: "tone-sand",
};

/** Someone's picture: a cast photo, or their initial on glass in their tone (icy by default). */
export function Avatar({
  name,
  image,
  size,
  muted = false,
  className = "",
}: {
  name: string;
  image?: string | null;
  size: keyof typeof SIZES;
  /** an invited room member who hasn't joined yet */
  muted?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const a = parseAvatar(image);
  const base = `relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${s.box} ${className}`;
  if (a?.kind === "photo") {
    return (
      <span className={`${base} glass-cell ${muted ? "opacity-50" : ""}`}>
        <Image src={photoUrl(a.path)} alt="" fill sizes={`${s.px}px`} className="object-cover" />
      </span>
    );
  }
  const tone = muted ? "glass-cell text-muted" : `glass-accent ${a?.kind === "tone" ? TONE_CLASS[a.tone] : ""}`;
  return <span className={`${base} ${tone}`}>{name.charAt(0).toUpperCase()}</span>;
}
