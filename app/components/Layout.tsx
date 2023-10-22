"use client"

import { useEffect, useState } from "react"

import useDarkMode from "@/store/ui/darkModeStore"
import { Portal } from "./Portal"
import { InitialPageLoadingSkeleton } from "./Skeletons/InitialPageLoadingSkeleton"

export default function Layout({ children }: { children: React.ReactNode }) {
  const darkMode = useDarkMode()

  const [showSkeleton, setShowSkeleton] = useState(true)

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
    setShowSkeleton(false)
  }, [darkMode.isDarkMode])

  //don't use const const queryClient = new QueryClient() - https://tanstack.com/query/latest/docs/react/guides/ssr

  return (
    <div
      className="bg-background text-title
      min-h-screen transition-colors duration-300 pt-[62px]">
      {showSkeleton && (
        <Portal>
          <InitialPageLoadingSkeleton />
        </Portal>
      )}
      {children}
    </div>
  )
}
