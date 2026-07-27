import React, { forwardRef, ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

import { BaseInput } from "./BaseInput"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number | undefined
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  startIcon?: React.ReactElement
  endIcon?: React.ReactElement
  pattern?: string
  required?: boolean
}

// http://localhost:6006/?path=/story/ui-inputs-baseinput--states
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
      <BaseInput
        className={twMerge(startIcon && "pl-8", endIcon && "pr-8", className)}
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
