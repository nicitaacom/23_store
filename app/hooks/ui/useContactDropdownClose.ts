"use client"

import { useEffect, useRef } from "react"

import { useContactDropdown } from "@/store/ui/contactDropdown"

const useContactDropdownClose = () => {
  const contactDropdownRef = useRef<HTMLDivElement>(null)
  const { isDropdown, openDropdown, closeDropdown, toggle } = useContactDropdown()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyPress)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyPress)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isDropdown, openDropdown, closeDropdown, toggle, contactDropdownRef }
}

export default useContactDropdownClose
