'use client'

import { useEffect } from "react"

import useDarkMode from "@/store/ui/darkModeStore"


export function Layout ({children}:{children:React.ReactNode}) {
  //children inside client component - is server component by default
  //more info - https://www.youtube.com/watch?v=9YuHTGAAyu0&ab_channel=ByteGrad
  const darkMode = useDarkMode()

useEffect(() => {
  const htmlElement = document.documentElement;
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  // Set initial mode based on system preference
  htmlElement.classList.toggle("light", !prefersDarkMode);
  htmlElement.classList.toggle("dark", prefersDarkMode);

  // Update mode when darkMode state changes
  htmlElement.classList.toggle("light", !darkMode.isDarkMode);
  htmlElement.classList.toggle("dark", darkMode.isDarkMode);
}, [darkMode.isDarkMode]);

return (
    <div className="bg-background text-title
        min-h-screen transition-colors duration-300 pt-[62px]">
      {children}
    </div>
)
}