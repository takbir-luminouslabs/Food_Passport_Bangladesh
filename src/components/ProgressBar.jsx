/** Accessible progress bar. Always pair it with a visible text label (never colour alone). */
export default function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-3 w-full overflow-hidden rounded-full bg-primary/15"
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  )
}
