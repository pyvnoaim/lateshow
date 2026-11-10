import { Search } from "lucide-react";
import Link from "next/link";
import { SearchField } from "./SearchField";

/**
 * Sits over the page (absolute), so Home and Title backdrops run underneath it.
 * ponytail: the "up next" chip on the right comes with the library feature (needs watch progress).
 */
export function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-[88px] max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-12">
        <Link href="/" className="text-[22px] font-bold tracking-[-0.035em]">Lateshow</Link>
        {/* auto margins split the leftover space evenly, so the gaps on both sides match whatever sits right */}
        <div className="mx-auto hidden max-w-[560px] flex-1 sm:block">
          <SearchField />
        </div>
        <div className="flex justify-end">
          <Link href="/search" aria-label="Search" className="press flex size-11 items-center justify-center rounded-full sm:hidden">
            <Search size={20} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
