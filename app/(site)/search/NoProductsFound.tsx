"use client"

import useDarkMode from "@/store/ui/darkModeStore"
import Image from "next/image"

export function NoProductsFound() {
  const { isDarkMode } = useDarkMode()

  return (
    <div className="min-h-[calc(100vh-64px)] px-8 flex flex-col gap-y-8 justify-center items-center pb-16">
      <Image
        src={isDarkMode ? "/no-products-found-dark.png" : "/no-products-found-light.png"}
        alt="No products found"
        width={256}
        height={256}
      />
      <h1 className="h-full text-4xl font-bold text-center">No products found</h1>
    </div>
  )
}
