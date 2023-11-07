"use client"
import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import { useRouter } from "next/navigation"

export function Logo() {
  const darkMode = useDarkMode()
  const router = useRouter()
  return (
    <>
      <Image
        className="cursor-pointer hidden mobile:flex"
        src={darkMode.isDarkMode ? "/23_store-dark.png" : "/23_store-light.png"}
        alt="logo"
        width={135}
        height={32}
        onClick={() => router.push("/")}
        priority
      />
      <Image
        className="cursor-pointer flex mobile:hidden"
        src={darkMode.isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
        alt="logo"
        width={60}
        height={44}
        onClick={() => router.push("/")}
        priority
      />
    </>
  )
}
