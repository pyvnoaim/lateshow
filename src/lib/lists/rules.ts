export type Visibility = "private" | "friends" | "link";

export const VISIBILITY: { key: Visibility; label: string }[] = [
  { key: "private", label: "Only you" },
  { key: "friends", label: "Friends" },
  { key: "link", label: "Anyone with the link" },
];

/** Whether someone may open a list. `viewerId` null = signed out. The one place list access is decided. Pure. */
export function canSeeList(
  l: { userId: string; visibility: Visibility },
  viewerId: string | null,
  friends: boolean,
): boolean {
  if (viewerId === l.userId) return true;
  if (l.visibility === "link") return true;
  return l.visibility === "friends" && viewerId !== null && friends;
}
