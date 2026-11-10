import Image from "next/image";
import { img, type Service } from "@/lib/tmdb";

/** Small streaming service logo with its name, for the caption line under a poster. */
export function ServiceBadge({ service, nameHidden = false }: { service: Service; nameHidden?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Image
        src={img(service.logoPath, "w92")!}
        alt={nameHidden ? service.name : ""}
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-sm"
      />
      {!nameHidden && <span className="truncate">{service.name}</span>}
    </span>
  );
}
