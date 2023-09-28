import { useEffect, useRef, useState } from "react"

const useCloseOnClickOutside = () => {
  const [isDropdown, setIsDropdown] = useState(false)
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsDropdown(false)
      }
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyPress)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyPress)
    }
  }, [])

  return { isDropdown, dropdownContainerRef, setIsDropdown }
}

export default useCloseOnClickOutside
