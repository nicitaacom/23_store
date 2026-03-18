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
        `relative flex cursor-pointer items-center justify-center rounded-xl border border-border-color/70
        bg-background/40 px-4 py-3 text-sm font-medium text-title transition-all duration-200
        hover:border-title/30 hover:bg-foreground/60`,
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
        className="absolute inset-0 rounded-xl border border-transparent transition-all duration-200
        peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:shadow-[inset_0_0_0_1px_hsl(var(--brand)/0.2)]"
      />
      <span className="relative z-[1]">{children ? children : label}</span>
    </label>
  )
}
