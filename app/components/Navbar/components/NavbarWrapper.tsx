"use client"

import React, { useEffect, useState } from "react"

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
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
      className={`fixed flex flex-row justify-between items-center 
    px-4 tablet:px-6 laptop:px-8 py-2 max-h-[64px] mx-auto z-[99] text-title w-full transition-all duration-300
    ${scrollPosition < 40 ? "bg-background" : "bg-foreground"}`}>
      {children}
    </nav>
  )
}
