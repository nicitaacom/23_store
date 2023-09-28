import { IconType } from "react-icons"
import { twMerge } from "tailwind-merge"

interface DropdownItemProps {
  icon: IconType
  label: string
  onClick: () => void
  size?: number
  className?: string
  labelClassName?: string
}

export function DropdownItem({
  icon: Icon,
  label,
  size,
  className = "",
  labelClassName = "",
  onClick,
}: DropdownItemProps) {
  return (
    <li
      className={twMerge(`py-2 first:border-none border-t-[1px] border-solid border-secondary
    hover:brightness-75 transition-all duration-100 z-[1]
     ${className}`)}
      onClick={onClick}>
      <div className="flex justify-center items-center gap-x-2 px-4 cursor-pointer">
        <Icon size={size ? size : 24} />
        <a className={labelClassName}>{label}</a>
      </div>
    </li>
  )
}
