import { twMerge } from "tailwind-merge"

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
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
    <div className={`relative ${className}`}>
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">{startIcon}</div>
      <input
        className={twMerge(`w-full rounded border-[1px] border-solid bg-transparent text-title px-4 py-2 mb-1 outline-none 
        ${startIcon && "pl-10"}`)}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        pattern={pattern}
        name={name}
        required={required}
        autoFocus
        {...props}
      />
      <div className="absolute right-0 top-[50%] translate-y-[-55%] translate-x-[-25%]">{endIcon}</div>
    </div>
  )
}
