import { useEffect, useRef, useState } from "react"

const useCloseOnClickOutside = () => {
  const [isDropdown, setIsDropdown] = useState(false)

  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.target instanceof Node && !dropdownContainerRef.current?.contains(e.target)) {
        setIsDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
  }, [])

  return { isDropdown, dropdownContainerRef, setIsDropdown }
}

export default useCloseOnClickOutside
