"use client"

import { useEffect, useRef } from "react"

import { useSupportDropdown } from "@/store/ui/supportDropdown"

const useSupportDropdownClose = () => {
  const supportDropdownRef = useRef<HTMLDivElement>(null)
  const { isDropdown, openDropdown, closeDropdown, toggle } = useSupportDropdown()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supportDropdownRef.current && !supportDropdownRef.current.contains(event.target as Node)) {
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

  return { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef }
}

export default useSupportDropdownClose
