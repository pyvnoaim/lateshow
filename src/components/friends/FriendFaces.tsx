/** Up to three small overlapping avatars and a line of text: "anna_k and ben watched this". */
export function FriendFaces({ names, text }: { names: string[]; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-caption text-muted">
      <span aria-hidden className="flex shrink-0">
        {names.slice(0, 3).map((n, i) => (
          <span
            key={n}
            className={`flex size-5 items-center justify-center rounded-full text-badge font-bold glass-accent ${i > 0 ? "-ml-1.5 ring-2 ring-bg" : ""}`}
          >
            {n.charAt(0).toUpperCase()}
          </span>
        ))}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}
