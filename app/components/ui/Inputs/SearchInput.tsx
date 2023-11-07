import { type ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: string
  className?: string
  startIcon?: React.ReactElement
  pattern?: string
  name?: string
  required?: boolean
}

export function SearchInput({
  type = "text",
  className = "",
  startIcon,
  pattern,
  required = false,
  name,
  ...props
}: InputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">{startIcon}</div>
      <input
        className={twMerge(`w-full rounded border-[1px] border-solid bg-transparent px-4 py-2 mb-1 outline-none 
        ${startIcon && "pl-10"}`)}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        pattern={pattern}
        name={name}
        required={required}
        {...props}
      />
    </div>
  )
}
