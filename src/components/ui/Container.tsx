import type { ReactNode } from "react";

const sizes = { wide: "max-w-page 2xl:max-w-page-wide 2xl:px-16", narrow: "max-w-reading" } as const;

/** The page column: same side padding everywhere. `wide` for grids and heroes, `narrow` for reading pages. */
export function Container({
  as: Tag = "div",
  size = "wide",
  className = "",
  children,
}: {
  as?: "div" | "main" | "section" | "header";
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`mx-auto w-full px-4 sm:px-12 ${sizes[size]} ${className}`.trim()}>{children}</Tag>;
}
