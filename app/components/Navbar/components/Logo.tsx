"use client"
import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import { useRouter } from "next/navigation"

export default function Logo() {
  const darkMode = useDarkMode()
  const router = useRouter()
  return (
    <Image
      className="cursor-pointer"
      src={darkMode.isDarkMode ? "/23_store-dark.png" : "/23_store-light.png"}
      alt="logo"
      width={135}
      height={32}
      onClick={() => router.push("/")}
      priority
    />
  )
}