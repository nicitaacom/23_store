"use client"

import { useEffect, useState } from "react"

import useDarkMode from "@/store/ui/darkModeStore"

export default function Layout({ children }: { children: React.ReactNode }) {
  const darkMode = useDarkMode()

  //children is a server component
  //more info - https://www.youtube.com/watch?v=9YuHTGAAyu0
  useEffect(() => {
    const htmlElement = document.documentElement
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches

    // Set initial mode based on system preference
    htmlElement.classList.toggle("light", !prefersDarkMode)
    htmlElement.classList.toggle("dark", prefersDarkMode)

    // Update mode when darkMode state changes
    htmlElement.classList.toggle("light", !darkMode.isDarkMode)
    htmlElement.classList.toggle("dark", darkMode.isDarkMode)

    //remove initial page loading skeleton
    document.getElementById("initial-loading")?.remove()
  }, [darkMode.isDarkMode])

  //don't use const const queryClient = new QueryClient() - https://tanstack.com/query/latest/docs/react/guides/ssr

  return (
    <div
      className="bg-background text-title
      min-h-screen transition-colors duration-300 pt-[62px]">
      {children}
    </div>
  )
}
