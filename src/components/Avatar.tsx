import { parseTone, type Tone } from "@/lib/avatar";

const SIZES = {
  xs: "size-5 text-badge",
  sm: "size-8 text-small",
  md: "size-12 text-body",
  lg: "size-16 text-section",
  xl: "size-18 text-section",
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

/** Someone's picture: their initial on glass in their tone (icy by default). */
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
  const tone = parseTone(image);
  const look = muted ? "glass-cell text-muted" : `glass-accent ${tone ? TONE_CLASS[tone] : ""}`;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${SIZES[size]} ${look} ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
