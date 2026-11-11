import { getImagesByUsername } from "@/lib/friends/queries";
import { Avatar } from "@/components/Avatar";

/** Up to three small overlapping avatars and a line of text: "anna_k and ben watched this". */
export async function FriendFaces({ names, text }: { names: string[]; text: string }) {
  const shown = names.slice(0, 3);
  const images = await getImagesByUsername(shown);
  return (
    <span className="flex min-w-0 items-center gap-2 text-caption text-muted">
      <span aria-hidden className="flex shrink-0">
        {shown.map((n, i) => (
          <Avatar key={n} name={n} image={images.get(n)} size="xs" className={i > 0 ? "-ml-1.5 ring-2 ring-bg" : ""} />
        ))}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}
