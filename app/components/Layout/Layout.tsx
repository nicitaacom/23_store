"use client"

import { useEffect } from "react"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { User } from "@supabase/supabase-js"
import { useSetUser } from "./hooks/useSetUser"

export default function Layout({ children, user }: { children: React.ReactNode; user: User | null }) {
  const darkMode = useDarkModeStore()

  useSetUser(user)

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
  }, [darkMode.isDarkMode])

  return (
    <main
      className="flex min-h-screen w-full flex-col overflow-x-clip
      bg-background text-title
      transition-colors duration-300">
      {children}
    </main>
  )
}
