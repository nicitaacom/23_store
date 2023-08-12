import useCloseOnClickOutlise from "../../hooks/useCloseOnClickOutside"

interface DropdownContainerProps {
  children: React.ReactNode
  size?: number
  icon: React.ReactElement
  className?: string
}

export function DropdownContainer({ children, icon, className = "" }: DropdownContainerProps) {
  const { isDropdown, dropdownContainerRef, setIsDropdown } = useCloseOnClickOutlise()

  return (
    <div className={`relative z-10`} ref={dropdownContainerRef}>
      <div className="cursor-pointer" onClick={() => setIsDropdown(!isDropdown)}>
        {icon}
      </div>

      <div
        className={`absolute right-[0%] top-[45px] z-[2] bg-primary text-secondary ${className}
      before:absolute before:right-[0] before:top-[-8px] before:h-4 before:w-4 before:translate-x-[-50%] before:rotate-45
       before:border-l-[1px] before:border-t-[1px] before:border-solid before:border-secondary before:bg-primary
       ${isDropdown
            ? "visible translate-y-0 opacity-100 transition-all duration-300"
            : "invisible translate-y-[-20px] opacity-0 transition-all duration-300"
          }`}>
        <div className="text-md rounded-md border-[1px] border-solid border-secondary"
          onClick={() => setIsDropdown(!isDropdown)}>
          {children}</div>
      </div>
    </div>
  )
}

// css
/*
<div className={`dropdown-container`} ref={dropdownContainerRef}>
      <BiUserCircle className="menu-trigger" onClick={() => setIsDropdown(!isDropdown)} />

      <div className={`dropdown-menu ${isDropdown ? 'dropdown-active' : 'dropdown-inactive'}`}>
        <div className='dropdown-menu-title'><h3>The Kiet</h3><span className='subTitle'>Webiste Designer</span></div>
        <ul>
          {children}
        </ul>
      </div>
    </div>
*/
