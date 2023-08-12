import { useEffect, useRef, useState } from "react"

const useCloseOnClickOutlise = () => {
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

export default useCloseOnClickOutlise
