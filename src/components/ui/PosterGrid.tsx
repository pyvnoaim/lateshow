import type { ReactNode } from "react";

const GRID = "grid grid-cols-posters gap-x-5 gap-y-8";

/** Every poster grid on the site uses this, so columns and gaps never drift. */
export function PosterGrid({ children }: { children: ReactNode }) {
  return <div className={GRID}>{children}</div>;
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="aspect-poster sk rounded-poster" />
          <div className="h-3 w-2/3 sk rounded-md" />
        </div>
      ))}
    </div>
  );
}
