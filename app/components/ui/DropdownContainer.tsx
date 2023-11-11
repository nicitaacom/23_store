"use client"

import useAvatarDropdownClose from "@/hooks/ui/useAvatarDropdownClose"
import { twMerge } from "tailwind-merge"

interface DropdownContainerProps {
  children: React.ReactNode
  icon: React.ReactNode
  className?: string
  classNameDropdownContainer?: string
  username?: string | undefined
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
  isDropdown,
  toggle,
  dropdownRef,
}: DropdownContainerProps) {
  return (
    <div className={`relative z-10 ${classNameDropdownContainer}`} ref={dropdownRef}>
      <div className="cursor-pointer hover:brightness-75 duration-300" onClick={toggle}>
        {icon}
      </div>

      <div
        className={twMerge(`absolute top-[45px] right-[0%] w-[500px] z-[2] text-title-foreground
      before:w-4 before:h-4 before:bg-foreground before:border-l-[1px] before:border-t-[1px] before:border-solid before:border-border-color
       before:rotate-45 before:absolute before:top-[-8px] before:right-[0] before:translate-x-[-50%]
       ${
         isDropdown
           ? "opacity-100 visible translate-y-0 transition-all duration-300"
           : "opacity-0 invisible translate-y-[-20px] transition-all duration-300"
       } ${className}`)}>
        <div className="text-md border-[1px] border-solid border-border-color bg-foreground rounded-md">
          {username && <h1 className="text-center">Hi {username}</h1>}
          {children}
        </div>
      </div>
    </div>
  )
}
