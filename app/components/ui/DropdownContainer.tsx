"use client"

import { twMerge } from "tailwind-merge"

import { useHasMounted } from "@/hooks/useHasMounted"

interface DropdownContainerProps {
  children: React.ReactNode
  icon: React.ReactNode
  className?: string
  classNameDropdownContainer?: string
  classNameIsDropdownTrue?: string
  classNameIsDropdownFalse?: string
  username?: string | undefined
  onClick?: () => void
  isDropdown: boolean
  toggle: () => void
  dropdownRef: React.RefObject<HTMLDivElement>
}

export function DropdownContainer({
  children,
  icon,
  username,
  className = "",
  classNameDropdownContainer = "",
  classNameIsDropdownTrue,
  classNameIsDropdownFalse,
  isDropdown,
  toggle,
  onClick,
  dropdownRef,
}: DropdownContainerProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    toggle()
  }

  // to prevent hydration error (don't pass username through props from Navbar to here cause user see that username only onClick)
  // onClick work on client but not on server
  const hasMounted = useHasMounted()

  return (
    <div className={twMerge("relative z-10", classNameDropdownContainer)} ref={dropdownRef}>
      <div className="cursor-pointer transition-opacity duration-150 hover:opacity-80" onClick={handleClick}>
        {icon}
      </div>

      <div
        className={twMerge(
          `absolute right-0 top-[calc(100%+6px)] z-[2] w-[min(92vw,280px)] text-title`,
          isDropdown
            ? `visible translate-y-0 opacity-100 transition-all duration-150 ${classNameIsDropdownTrue}`
            : `invisible -translate-y-1 opacity-0 transition-all duration-150 ${classNameIsDropdownFalse}`,
          className,
        )}>
        <div className="overflow-hidden rounded-lg border border-border-color/35 bg-foreground/95 text-sm shadow-compact">
          {username && hasMounted && <h1 className="border-b border-border-color/30 px-3 py-2 text-center text-title">Hi {username}</h1>}
          {children}
        </div>
      </div>
    </div>
  )
}
