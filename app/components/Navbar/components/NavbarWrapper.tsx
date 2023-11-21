"use client"

import React, { useEffect, useState } from "react"

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const [scrollPosition, setScrollPosition] = useState(0)

  useEffect(() => {
    function handleScroll() {
      const position = window.scrollY
      setScrollPosition(position)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])
  return (
    <nav
      id="nav"
      className={`relative z-[1499] w-full min-h-[64px] flex flex-row justify-between items-center 
      px-4 tablet:px-6 laptop:px-8 py-2 mx-auto text-title transition-colors duration-300
    ${scrollPosition < 40 ? "bg-background" : "bg-foreground"}`}>
      {children}
    </nav>
  )
}
