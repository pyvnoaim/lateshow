const base =
  "press inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const tones = {
  /** White pill, the one main action on a screen. */
  primary: "bg-fg text-bg hover:bg-fg/90",
  /** Frosted glass, secondary actions over images. */
  glass: "glass",
  /** Quiet raised pill, lists of choices (services, filters). */
  quiet: "bg-raised",
  /** No background until hover, for icons and text actions. */
  ghost: "hover:bg-fg/10",
  /** Raised round background, for icons over content. */
  raised: "bg-raised",
  /** Blue, for something that is on (watched, on the watchlist). */
  accent: "bg-accent text-bg",
} as const;

const sizes = {
  md: "h-12 px-6 text-base",
  sm: "h-11 px-5 text-label",
  icon: "size-11",
} as const;

export type ButtonTone = keyof typeof tones;
export type ButtonSize = keyof typeof sizes;

/**
 * Class names for anything that looks like a button: <button>, <a>, <Link>, Radix triggers.
 * Tone and size are separate so no caller ever has to override a height or padding.
 * `className` is for layout only (position, margin), never for look.
 */
export function buttonStyles(tone: ButtonTone = "primary", size: ButtonSize = "md", className = "") {
  return `${base} ${tones[tone]} ${sizes[size]} ${className}`.trim();
}
