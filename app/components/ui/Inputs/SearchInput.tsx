import { twMerge } from "tailwind-merge"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: string
  className?: string
  startIcon?: React.ReactElement
  endIcon?: React.ReactNode
  pattern?: string
  name?: string
  required?: boolean
}

export function SearchInput({
  type = "text",
  className = "",
  startIcon,
  endIcon,
  pattern,
  required,
  name,
  ...props
}: InputProps) {
  return (
    <div className="relative">
      {startIcon && <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon-color">{startIcon}</div>}
      <input
        className={twMerge(
          "h-8 w-full rounded border border-border-color/35 bg-background/70 px-3 text-sm text-title outline-none transition-colors duration-150 placeholder:text-subTitle/55 focus:border-brand/35 focus:bg-background",
          startIcon && "pl-8",
          endIcon && "pr-8",
          className,
        )}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        pattern={pattern}
        name={name}
        required={required}
        autoFocus
        {...props}
      />
      {endIcon && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-icon-color">{endIcon}</div>}
    </div>
  )
}
