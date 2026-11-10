import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A titled block on a page.
 * `description` is one muted line under the title. `aside` holds tabs, hints or actions:
 * next to the title by default, or pushed to the right edge with `asideAt="end"`.
 * `moreHref` adds a quiet "See all" link on the right edge, for rows that have a full page.
 */
export function Section({
  title,
  description,
  aside,
  asideAt = "title",
  moreHref,
  children,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  asideAt?: "title" | "end";
  moreHref?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div
        className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${asideAt === "end" || moreHref ? "justify-between" : ""}`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-section font-bold">{title}</h2>
          {description && <p className="text-label text-muted">{description}</p>}
        </div>
        {aside}
        {moreHref && (
          <Link
            href={moreHref}
            className="inline-flex items-center gap-0.5 text-label text-muted transition-colors hover:text-fg"
          >
            See all
            <ChevronRight size={16} strokeWidth={2} aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
