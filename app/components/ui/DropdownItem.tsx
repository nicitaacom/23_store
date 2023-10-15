import Link from "next/link"
import { IconType } from "react-icons"
import { twMerge } from "tailwind-merge"

interface DropdownItemProps {
  icon: IconType
  label: string
  onClick?: () => void
  href?: string
  size?: number
  className?: string
  labelClassName?: string
}

export function DropdownItem({
  icon: Icon,
  label,
  size,
  href,
  className = "",
  labelClassName = "",
  onClick,
}: DropdownItemProps) {
  return (
    <li
      className={twMerge(`py-2 first:border-none border-t-[1px] border-solid border-border-color
    hover:brightness-75 transition-all duration-100 z-[1]
     ${className}`)}
      onClick={onClick}>
      {href ? (
        <Link className="flex justify-center items-center gap-x-2 px-4 cursor-pointer" href={href}>
          <Icon className="text-icon-color" size={size ? size : 24} />
          <p className={labelClassName}>{label}</p>
        </Link>
      ) : (
        <div className="flex justify-center items-center gap-x-2 px-4 cursor-pointer">
          <Icon className="text-icon-color" size={size ? size : 24} />
          <p className={labelClassName}>{label}</p>
        </div>
      )}
    </li>
  )
}
