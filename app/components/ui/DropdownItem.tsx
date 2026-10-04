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
  ariaPressed?: boolean
  trailing?: React.ReactNode
}

// http://localhost:6006/?path=/story/ui-controls-selectioncontrols--selection
export function DropdownItem({
  icon: Icon,
  label,
  size,
  href,
  target = "_self",
  className = "",
  labelClassName = "",
  ariaPressed,
  trailing,
  onClick,
}: DropdownItemProps) {
  return (
    <li
      className={twMerge(
        `z-[1] cursor-pointer border-t border-border-color/30 first:border-none
        transition-colors duration-100 hover:bg-foreground/45`,
        className,
      )}>
      {href ? (
        <Link
          className="flex min-h-[44px] items-center gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-inset"
          href={href}
          target={target}>
          <Icon className="shrink-0 text-icon-color" size={size || 18} />
          <p className={twMerge("text-sm text-title", labelClassName)}>{label}</p>
        </Link>
      ) : (
        <button
          className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-inset"
          type="button"
          aria-pressed={ariaPressed}
          onClick={onClick}>
          <Icon className="shrink-0 text-icon-color" size={size || 18} />
          <p className={twMerge("flex-1 text-sm text-title", labelClassName)}>{label}</p>
          {trailing}
        </button>
      )}
    </li>
  )
}
