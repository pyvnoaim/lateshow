const base =
  "press inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors";

const variants = {
  /** White pill, the one main action on a screen. */
  primary: "h-12 bg-fg px-6 text-base text-bg",
  /** Frosted glass, secondary actions over images. */
  glass: "glass h-12 px-6 text-base",
  /** Quiet raised pill, lists of choices (services, filters). */
  quiet: "h-11 bg-raised px-5 text-label",
  /** Round icon button without a background until hover. */
  icon: "size-11 hover:bg-fg/10",
  /** Round icon button on a raised background. */
  iconRaised: "size-11 bg-raised",
} as const;

export type ButtonVariant = keyof typeof variants;

/**
 * Class names for anything that looks like a button: <button>, <a>, <Link>, Radix triggers.
 * A helper instead of a component so it works on every element without prop forwarding.
 */
export function buttonStyles(variant: ButtonVariant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`.trim();
}
