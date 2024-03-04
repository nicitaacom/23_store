"use client"
import useDarkMode from "@/store/ui/darkModeStore"
import Image from "next/image"

export function NoTicketsFound() {
  const { isDarkMode } = useDarkMode()

  return (
    <aside className="hidden laptop:flex justify-center items-center h-full shadow-[1px_3px_5px_rgba(0,0,0,0.5)] w-64 bg-foreground z-[99]">
      <div className="flex flex-col gap-y-2 justify-center items-center px-4">
        <Image
          src={isDarkMode ? "/no-tickets-found-dark.png" : "/no-tickets-found-light.png"}
          alt="no tickets found"
          width={256}
          height={153}
        />
        <h1>No tickets found</h1>
      </div>
    </aside>
  )
}
