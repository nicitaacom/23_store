import { ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface RadioButton extends React.HTMLAttributes<HTMLInputElement> {
  label: string
  inputName: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  children?: React.ReactNode
  disabled?: boolean
}

export function RadioButton({ label, inputName, onChange, children, disabled, ...props }: RadioButton) {
  return (
    <label
      htmlFor={label}
      className={twMerge(
        `relative cursor-pointer flex items-center justify-center mt-2 tablet:mt-0 px-4 py-2
    transition-all duration-300`,
        disabled && "opacity-50 pointer-events-none cursor-default",
      )}>
      <input
        type="radio"
        name={inputName}
        value={label}
        id={label}
        className="hidden peer"
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <span
        className={`before:absolute before:border-b-2 before:border-t-0 before:border-border-color before:w-full before:h-[50px]
        before:top-[50%] before:left-[50%] before:translate-x-[-50%] before:translate-y-[-50%]
        before:transition-all before:duration-300 
        peer-checked:before:border-brand peer-checked:before:border-b-2
        `}
      />
      {children ? children : label}
    </label>
  )
}
