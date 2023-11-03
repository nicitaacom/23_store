import Link from "next/link"
import { Component, FunctionComponent } from "react"
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
      className={twMerge(`first:border-none border-t-[1px] border-solid border-border-color
    hover:brightness-75 transition-all duration-100 z-[1] cursor-pointer
     ${className}`)}
      onClick={onClick}>
      {href ? (
        <Link className="flex justify-center items-center gap-x-2 px-4 py-2" href={href} target={target}>
          <Icon className="text-icon-color" size={size ? size : 24} />
          <p className={labelClassName}>{label}</p>
        </Link>
      ) : (
        <div className="flex justify-center items-center gap-x-2 px-4 py-2">
          <Icon className="text-icon-color" size={size ? size : 24} />
          <p className={labelClassName}>{label}</p>
        </div>
      )}
    </li>
  )
}
