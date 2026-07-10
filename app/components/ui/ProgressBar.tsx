import { twMerge } from "tailwind-merge"

interface ProgressBarProps {
  className?: string
  value: number // 0..1
  label?: string
}

// Thin determinate progress bar driven by a 0..1 fraction (e.g. XHR upload / streamed download).
export function ProgressBar({ className, value, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100)

  return (
    <div className={twMerge("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs text-subTitle">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-color/25">
        <div style={{ width: `${percent}%` }} className="h-full rounded-full bg-success transition-[width] duration-150" />
      </div>
    </div>
  )
}
