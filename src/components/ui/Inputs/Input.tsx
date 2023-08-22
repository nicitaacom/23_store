import { motion } from "framer-motion"
import { useState, type ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: string
  value: string | number | undefined
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  className?: string
  startIcon?: React.ReactElement
  pattern?: string
  inputError?: string
  required?: boolean
}

export function Input({type = "text",value,onChange, className = "", startIcon, pattern, required = false,
 inputError,  ...props
}: InputProps) {

  const [isError, setIsError] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const isValid = pattern ? new RegExp(pattern).test(inputValue) : true;

    setIsError(!isValid);
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
    <div className={`relative ${isError && 'mb-4'} ${className}`}>
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">{startIcon}</div>
      <input
        className={twMerge(`w-full rounded border-[1px] border-solid bg-transparent px-4 py-2 mb-1 outline-none 
        ${startIcon && "pl-10"}`)}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={handleInputChange}
        pattern={pattern}
        required
        {...props}
      />
      {isError && (
        <motion.p
          className="absolute font-secondary text-danger text-xs"
          initial={{ x: 0 }}
          animate={{ x: [0, -2, 2, 0] }}>
          {inputError}
        </motion.p>
      )}
    </div>
  )
}
