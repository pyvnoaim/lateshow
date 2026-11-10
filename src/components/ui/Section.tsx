import type { ReactNode } from "react";

/**
 * A titled block on a page.
 * `description` is one muted line under the title. `aside` holds tabs, hints or actions:
 * next to the title by default, or pushed to the right edge with `asideAt="end"`.
 */
export function Section({
  title,
  description,
  aside,
  asideAt = "title",
  children,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  asideAt?: "title" | "end";
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${asideAt === "end" ? "justify-between" : ""}`}>
        <div className="flex flex-col gap-1">
          <h2 className="text-section font-bold">{title}</h2>
          {description && <p className="text-label text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
