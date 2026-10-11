import { twMerge } from "tailwind-merge"

interface ProgressBarProps {
  className?: string
  labelClassName?: string
  value: number // 0..1
  label?: string
}

// Thin determinate progress bar driven by a 0..1 fraction (e.g. XHR upload / streamed download).
// http://localhost:6006/?path=/story/ui-controls-selectioncontrols--selection
export function ProgressBar({ className, labelClassName, value, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100)

  return (
    <div className={twMerge("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex min-w-0 items-start justify-between gap-2 text-xs text-subTitle">
          <span className={twMerge("min-w-0 flex-1 [overflow-wrap:anywhere]", labelClassName)} title={label}>{label}</span>
          <span className="shrink-0 tabular-nums">{percent}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-color/25" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${percent}%` }} className="h-full rounded-full bg-success transition-[width] duration-150" />
      </div>
    </div>
  )
}
