/** Every text input is a glass pill (design rule). The pill shows focus, the input inside never draws its own box. */
const pill =
  "glass flex items-center gap-3 rounded-full text-muted focus-within:ring-1 focus-within:ring-fg/30 focus-within:ring-inset";

const sizes = {
  /** Search and filters. */
  md: "h-12 pr-2 pl-4.5",
  /** Forms with a button inside the pill (sign in). */
  lg: "h-14 pr-1.5 pl-5",
} as const;

export function fieldStyles(size: keyof typeof sizes = "md") {
  return `${pill} ${sizes[size]}`;
}

export const fieldInputStyles =
  "min-w-0 flex-1 bg-transparent text-label text-fg outline-none placeholder:text-muted focus-visible:outline-none";
