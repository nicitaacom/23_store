import { twMerge } from "tailwind-merge"
import { BsCheckLg } from "react-icons/bs"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isChecked: boolean
  onChange: () => void
  label: string
  labelClassName?: string
  disabled?: boolean
}

export function Checkbox({ isChecked, onChange, label, labelClassName = "", disabled, ...props }: CheckboxProps) {
  const inputId = props.id ?? label

  return (
    <label
      className={twMerge(
        "inline-flex cursor-pointer items-center gap-2 text-sm",
        disabled && "opacity-50 cursor-default pointer-events-none",
      )}
      htmlFor={inputId}>
      <input
        className="sr-only"
        type="checkbox"
        id={inputId}
        checked={isChecked}
        onChange={onChange}
        {...props}
      />
      <span
        className={twMerge(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border-color/50 bg-background/70 text-brand transition-colors duration-150",
          isChecked ? "border-brand/45 bg-brand/12" : "hover:border-brand/25 hover:bg-brand/8",
        )}>
        <BsCheckLg className={twMerge("h-3 w-3 transition-opacity duration-150", !isChecked && "opacity-0")} />
      </span>
      <span className={twMerge("select-none text-sm text-title", labelClassName)}>{label}</span>
    </label>
  )
}
