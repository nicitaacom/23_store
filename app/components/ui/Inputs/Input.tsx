import React, { forwardRef, ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number | undefined
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  startIcon?: React.ReactElement
  endIcon?: React.ReactElement
  pattern?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { type, value, onChange, className, startIcon, endIcon, pattern, required, ...rest } = props

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const inputValue = e.target.value
      const firstChar = inputValue.charAt(0)
      if (firstChar === "0" && inputValue.length > 1 && !inputValue.includes(".")) return
    }
    onChange(e)
  }

  return (
    <div className="relative">
      {startIcon && <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon-color">{startIcon}</div>}
      {endIcon && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-icon-color">{endIcon}</div>}
      <input
        className={twMerge(
          "h-8 w-full rounded border border-border-color/35 bg-background/70 px-3 text-sm text-title outline-none transition-colors duration-150 placeholder:text-subTitle/55 focus:border-brand/35 focus:bg-background",
          startIcon && "pl-8",
          endIcon && "pr-8",
          className,
        )}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={handleInputChange}
        pattern={pattern}
        required={required}
        ref={ref}
        {...rest}
      />
    </div>
  )
})

Input.displayName = "Input"
