"use client"

import { useEffect, useRef } from "react"

import { useAvatarDropdown } from "@/store/ui/avatarDropdown"

const useAvatarDropdownClose = () => {
  const avatarDropdownRef = useRef<HTMLDivElement>(null)
  const { isDropdown, openDropdown, closeDropdown, toggle } = useAvatarDropdown()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
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

  return { isDropdown, openDropdown, closeDropdown, toggle, avatarDropdownRef }
}

export default useAvatarDropdownClose
