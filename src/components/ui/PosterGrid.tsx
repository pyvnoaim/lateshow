import type { ReactNode } from "react";

// Fixed column counts that all divide 12, so a grid of 12 or 24 always ends on a full row.
const GRID = "grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

/** Every poster grid on the site uses this, so columns and gaps never drift. */
export function PosterGrid({ children }: { children: ReactNode }) {
  return <div className={GRID}>{children}</div>;
}

/** Placeholder posters in the grid's exact layout. `heading` adds a bar where the section title will be. */
export function PosterGridSkeleton({ count = 12, heading = false }: { count?: number; heading?: boolean }) {
  const grid = (
    <div className={GRID} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="aspect-poster sk rounded-poster" />
          <div className="h-3 w-2/3 sk rounded-md" />
          <div className="h-3 w-2/5 sk rounded-md" />
        </div>
      ))}
    </div>
  );
  if (!heading) return grid;
  return (
    <div className="flex flex-col gap-5">
      <div aria-hidden className="h-8 w-56 sk rounded-thumb" />
      {grid}
    </div>
  );
}
