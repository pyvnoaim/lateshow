/** Thin blue progress line. `className` sets the width (w-40, w-full). */
export function ProgressBar({
  percent,
  label,
  className = "w-full",
}: {
  percent: number;
  label: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-0.75 overflow-hidden rounded-full bg-fg/25 ${className}`}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}
