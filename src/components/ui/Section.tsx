import type { ReactNode } from "react";

/** A titled block on a page. `aside` sits next to the title (a hint, tabs, a filter). */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h2 className="text-section font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
