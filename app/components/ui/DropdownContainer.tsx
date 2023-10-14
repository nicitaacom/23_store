"use client"

import useCloseOnClickOutlise from "@/hooks/ui/useCloseOnClickOutside"
import { twMerge } from "tailwind-merge"

interface DropdownContainerProps {
  children: React.ReactNode
  icon: React.ReactNode
  className?: string
  classNameDropdownContainer?: string
  username?: string | undefined
}

export function DropdownContainer({
  children,
  icon,
  username,
  className = "",
  classNameDropdownContainer = "",
}: DropdownContainerProps) {
  const { isDropdown, dropdownContainerRef, setIsDropdown } = useCloseOnClickOutlise()

  return (
    <div className={`relative z-10 ${classNameDropdownContainer}`} ref={dropdownContainerRef}>
      <div className="cursor-pointer hover:brightness-75 duration-300" onClick={() => setIsDropdown(!isDropdown)}>
        {icon}
      </div>

      <div
        className={twMerge(`absolute top-[45px] right-[0%] w-[500px] z-[2] text-secondary bg-primary 
      before:w-4 before:h-4 before:bg-primary before:border-l-[1px] before:border-t-[1px] before:border-solid before:border-secondary
       before:rotate-45 before:absolute before:top-[-8px] before:right-[0] before:translate-x-[-50%]
       ${
         isDropdown
           ? "opacity-100 visible translate-y-0 transition-all duration-300"
           : "opacity-0 invisible translate-y-[-20px] transition-all duration-300"
       } ${className}`)}>
        <div className="text-md border-[1px] border-solid border-secondary rounded-md">
          {username && <h1 className="text-center">Hi&nbsp; {username}</h1>}
          {children}
        </div>
      </div>
    </div>
  )
}
