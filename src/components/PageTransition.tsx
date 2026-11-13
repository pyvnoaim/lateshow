"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Page switch: keyed by the path, so a new page exits the old one and enters the new one (CSS: .page-out, .page-in).
 * Only a path change animates. A refresh after a setting saves stays still.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition key={usePathname()} enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
