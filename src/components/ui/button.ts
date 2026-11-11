const base =
  "press inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold disabled:pointer-events-none disabled:opacity-50";

const tones = {
  /** Tinted (milky white) glass, the one main action on a screen. */
  primary: "glass-tint",
  /** Frosted glass, secondary actions over images. */
  glass: "glass",
  /** Icon only, no background until hover, then glass fades in (same as quiet links). */
  ghost: "glass-hover",
  /** Quiet text action (Sign out, Send again): grey, turns white on hover, nothing else moves or fills. */
  text: "text-muted transition-colors hover:text-fg",
  /** Blue tinted glass, for something that is on (watched, on the watchlist). */
  accent: "glass-accent",
  /** Frosted glass with a red label: an action that deletes something. */
  danger: "glass sheen-danger text-danger",
  /** Red glass: confirming the deletion. */
  dangerConfirm: "glass-danger",
} as const;

const sizes = {
  md: "h-12 px-6 text-base",
  sm: "h-11 px-5 text-label",
  icon: "size-11",
  /** Just the text, no height or padding, so it lines up with the text around it. */
  text: "text-label",
  /** Small round icon for dense lists. The invisible ring keeps the tap target finger-sized. */
  iconSm: "relative size-8 before:absolute before:-inset-1.5",
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
