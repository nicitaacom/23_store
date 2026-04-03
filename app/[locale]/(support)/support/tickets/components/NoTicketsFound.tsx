"use client"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import Image from "next/image"

export function NoTicketsFound() {
  const { isDarkMode } = useDarkModeStore()

  return (
    <aside className="hidden h-full w-[320px] shrink-0 laptop:flex">
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border-color/35 bg-foreground/45 px-6 text-center">
        <Image
          src={isDarkMode ? "/no-tickets-found-dark.png" : "/no-tickets-found-light.png"}
          alt="no tickets found"
          width={256}
          height={153}
        />
        <h1 className="mt-6 font-secondary text-2xl font-bold tracking-tight text-title">No tickets found</h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-subTitle">New customer conversations will appear here as soon as they open a ticket.</p>
      </div>
    </aside>
  )
}
