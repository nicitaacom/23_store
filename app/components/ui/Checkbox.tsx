import { twMerge } from "tailwind-merge"
import { BsCheckLg } from "react-icons/bs"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  isChecked: boolean
  onChange: () => void
  label: string
  labelClassName?: string
  indicatorClassName?: string
  disabled?: boolean
}

export function Checkbox({
  isChecked,
  onChange,
  label,
  labelClassName = "",
  indicatorClassName = "",
  className = "",
  disabled,
  ...props
}: CheckboxProps) {
  const inputId = props.id ?? label

  return (
    <label
      className={twMerge(
        "inline-flex cursor-pointer items-center gap-2.5 text-sm text-title",
        disabled && "opacity-50 cursor-default pointer-events-none",
        className,
      )}
      htmlFor={inputId}>
      <input
        className="peer sr-only"
        type="checkbox"
        id={inputId}
        checked={isChecked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <span
        className={twMerge(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border-color/45 bg-background/65 text-brand transition-[background-color,border-color,color,box-shadow] duration-150 peer-focus-visible:ring-1 peer-focus-visible:ring-brand/35 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
          isChecked ? "border-brand/45 bg-brand/12" : "hover:border-brand/25 hover:bg-brand/8",
          indicatorClassName,
        )}>
        <BsCheckLg className={twMerge("h-3 w-3 transition-opacity duration-150", !isChecked && "opacity-0")} />
      </span>
      <span className={twMerge("select-none text-sm text-title", labelClassName)}>{label}</span>
    </label>
  )
}
