import React, { forwardRef, ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number | undefined
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  startIcon?: React.ReactElement
  pattern?: string
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { type, value, onChange, className, startIcon, pattern, required, ...rest } = props

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      const inputValue = e.target.value
      const firstChar = inputValue.charAt(0)
      if (firstChar === "0" && inputValue.length > 1 && !inputValue.includes(".")) {
        return
      }
    }
    onChange(e)
  }

  return (
    <div className={`relative ${className}`}>
      <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%) translateX(50%)" }}>{startIcon}</div>
      <input
        className={twMerge(
          `w-full rounded border border-solid bg-transparent px-4 py-2 mb-1 outline-none text-title ${
            startIcon ? "pl-10" : ""
          }`,
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

export default Input
