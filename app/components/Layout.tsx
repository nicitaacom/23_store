"use client"

import { useEffect } from "react"

import { getCookie, setCookie } from "@/utils/helpersCSR"

export default function Layout({ children }: { children: React.ReactNode }) {
  //children is a server component
  //more info - https://www.youtube.com/watch?v=9YuHTGAAyu0
  useEffect(() => {
    // set default (dark) theme if no cookie with name 'darkMode' found
    if (!getCookie("darkMode")) {
      setCookie("darkMode", "dark")
    }
  }, [])

  return (
    <main
      className={`flex flex-col w-full overflow-hidden min-h-screen
      bg-background text-title
      transition-colors duration-300`}>
      {children}
    </main>
  )
}
