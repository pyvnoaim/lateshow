import type { ReactNode } from "react";

/** Big two-line message for empty, missing and broken pages. Second line is grey. `children` are the actions. */
export function StatusMessage({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) {
  return (
    <div className="flex rise flex-col items-start gap-8">
      <h1 className="text-page leading-none font-bold">
        {title}
        <br />
        <span className="text-muted">{detail}</span>
      </h1>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
