import { ChangeEvent } from "react"
import { twMerge } from "tailwind-merge"

interface IRadioButtonProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "onChange"> {
  label: string
  inputName: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  children?: React.ReactNode
  disabled?: boolean
}

export function RadioButton({ label, inputName, onChange, children, disabled, ...props }: IRadioButtonProps) {
  return (
    <label
      className={twMerge(
        `relative flex cursor-pointer items-start justify-start rounded border border-border-color/35
        bg-foreground/45 px-3 py-2 text-sm font-medium text-title transition-colors duration-150
        hover:border-border-color/45 hover:bg-foreground/60`,
        disabled && "opacity-50 pointer-events-none cursor-default",
      )}
      htmlFor={label}>
      <input
        className="peer sr-only"
        type="radio"
        name={inputName}
        value={label}
        id={label}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <span
        className="absolute inset-0 rounded border border-transparent transition-colors duration-150
        peer-checked:border-brand/40 peer-checked:bg-brand/10"
      />
      <span className="relative z-[1] flex w-full min-w-0 whitespace-normal break-words leading-5">{children ? children : label}</span>
    </label>
  )
}
