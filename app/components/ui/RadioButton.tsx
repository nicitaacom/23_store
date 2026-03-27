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
        `relative flex cursor-pointer items-start justify-start rounded-[20px] border border-white/10
        bg-white/[0.03] px-4 py-3 text-sm font-medium text-title transition-all duration-200
        hover:border-white/20 hover:bg-white/[0.05]`,
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
        className="absolute inset-0 rounded-[20px] border border-transparent transition-all duration-200
        peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:shadow-[0_0_0_1px_rgba(32,233,89,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]"
      />
      <span className="relative z-[1] flex w-full min-w-0 whitespace-normal break-words leading-6">{children ? children : label}</span>
    </label>
  )
}
