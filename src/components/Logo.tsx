import Image from "next/image";

/** The mark (app/icon.svg, also the favicon) and the name. Same file everywhere, so there is one logo to change. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-logo font-bold tracking-tight">
      {/* an svg needs no resizing, and the optimizer won't take svg anyway */}
      <Image src="/icon.svg" alt="" width={28} height={28} unoptimized />
      Lateshow
    </span>
  );
}
