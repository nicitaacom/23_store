'use client'

import { useEffect } from "react"

import useDarkMode from "@/store/ui/darkModeStore"


export function Layout ({children}:{children:React.ReactNode}) {
  //children inside client component - is server component by default
  //more info - https://www.youtube.com/watch?v=9YuHTGAAyu0&ab_channel=ByteGrad
  const darkMode = useDarkMode()

    useEffect(() => {
    if (darkMode.isDarkMode) {
      document.getElementsByTagName("html")[0].classList.remove("light")
      document.getElementsByTagName("html")[0].classList.add("dark")
    } else {
      document.getElementsByTagName("html")[0].classList.remove("dark")
      document.getElementsByTagName("html")[0].classList.add("light")
    }
  }, [darkMode])

return (
    <div className="bg-background text-title
        min-h-screen transition-colors duration-300 pt-[62px]">
      {children}
    </div>
)
}