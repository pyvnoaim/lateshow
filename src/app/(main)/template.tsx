import { ViewTransition } from "react";

// Page switch: a template remounts on every route change, so the old page exits and the new one enters
// (CSS: .page-out, .page-in). A refresh after a setting saves doesn't remount, so it stays still.
export default function PageTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
