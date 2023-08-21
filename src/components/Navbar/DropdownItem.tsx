import { type IconType } from "react-icons"
import { twMerge } from "tailwind-merge"

interface DropdownItemProps {
  icon: IconType
  label: string
  onClick: () => void
  iconSize?: number
  className?: string
  labelClassName?: string
}

export function DropdownItem({
  icon: Icon,
  label,
  iconSize,
  className = "",
  labelClassName = "",
  onClick,
}: DropdownItemProps) {
  return (
    <li
      className={twMerge(`z-[1] border-t-[1px] border-solid border-border-color py-2
    transition-all duration-100 first:border-none hover:brightness-75 bg-background
     ${className}`)}
      onClick={onClick}>
      <div className="flex cursor-pointer items-center justify-center gap-x-2">
        <Icon className="text-icon-color" size={iconSize ? iconSize : 24} />
        <a className={labelClassName}>{label}</a>
      </div>
    </li>
  )
}

/* css
    <li className="dropdown-item-container">
      <div className="dropdown-item">
        <Icon size={24} />
        <a className="">{label}</a>
      </div>
    </li>
*/
