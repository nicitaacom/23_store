import useCloseOnClickOutlise from "../../hooks/ui/useCloseOnClickOutside"
import React from "react"

interface DropdownContainerProps {
  children: React.ReactNode
  icon: React.ReactNode
  className?: string
  username: string | undefined
}

export function DropdownContainer({ children, icon, username, className = "" }: DropdownContainerProps) {
  const { isDropdown, dropdownContainerRef, setIsDropdown } = useCloseOnClickOutlise()

  return (
    <div className={`relative z-10`} ref={dropdownContainerRef}>
      <div className="cursor-pointer" onClick={() => setIsDropdown(!isDropdown)}>
        {icon}
      </div>

      <div
        className={`absolute right-[0%] top-[45px] z-[2] ${className}
      before:absolute before:right-[0] before:top-[-8px] before:h-4 before:w-4 before:translate-x-[-50%] before:rotate-45
       before:border-l-[1px] before:border-t-[1px] before:border-solid before:border-border-color before:bg-background
       ${
         isDropdown
           ? "visible translate-y-0 opacity-100 transition-all duration-300"
           : "invisible translate-y-[-20px] opacity-0 transition-all duration-300"
       }`}>
        <div
          className="text-md rounded-md border-[1px] border-border-color overflow-hidden"
          onClick={() => setIsDropdown(!isDropdown)}>
          <h1 className="text-center bg-background flex flex-wrap justify-center items-center py-1">
            Hi&nbsp;<p>{username}</p>
          </h1>
          {children}
        </div>
      </div>
    </div>
  )
}
