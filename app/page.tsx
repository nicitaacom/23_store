import { useEffect } from "react"

import useDarkMode from "./store/ui/darkModeStore"


export function Home() {

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
    <div className="text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12">
      <section className="flex flex-col gap-y-4">
        
      </section>
    </div>
  )
}
