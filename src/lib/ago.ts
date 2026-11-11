/** "2 hours ago", "yesterday", "3 days ago", "Nov 2": short, for activity lines. Pure. */
export function ago(date: Date, now: Date) {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}
