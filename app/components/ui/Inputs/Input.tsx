import { type ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: string
  value: string | number | undefined
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  startIcon?: React.ReactElement
  pattern?: string
  required?: boolean
}

export function Input({type = "text",value,onChange, className = "", startIcon, pattern, required = false,  ...props
}: InputProps) {


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e);
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
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">{startIcon}</div>
      <input
        className={twMerge(`w-full rounded border-[1px] border-solid bg-transparent px-4 py-2 mb-1 outline-none 
        ${startIcon && "pl-10"}`)}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={handleInputChange}
        pattern={pattern}
        required={required}
        {...props}
      />
    </div>
  )
}
