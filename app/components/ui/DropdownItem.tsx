import { FunctionComponent } from "react"
import Link from "next/link"
import { IconType } from "react-icons"
import { twMerge } from "tailwind-merge"

interface DropdownItemProps {
  icon: IconType | FunctionComponent
  label: string
  onClick?: () => void
  href?: string
  target?: "_blank" | "_parent" | "_self" | "_top"
  size?: number
  className?: string
  labelClassName?: string
}

export function DropdownItem({
  icon: Icon,
  label,
  size,
  href,
  target = "_self",
  className = "",
  labelClassName = "",
  onClick,
}: DropdownItemProps) {
  return (
    <li
      className={twMerge(
        `z-[1] cursor-pointer border-t border-border-color/30 first:border-none
        transition-colors duration-100 hover:bg-foreground/45`,
        className,
      )}
      onClick={onClick}>
      {href ? (
        <Link className="flex items-center gap-2 px-3 py-2" href={href} target={target}>
          <Icon className="shrink-0 text-icon-color" size={size ? size : 18} />
          <p className={twMerge("text-sm text-title", labelClassName)}>{label}</p>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">
          <Icon className="shrink-0 text-icon-color" size={size ? size : 18} />
          <p className={twMerge("text-sm text-title", labelClassName)}>{label}</p>
        </div>
      )}
    </li>
  )
}
