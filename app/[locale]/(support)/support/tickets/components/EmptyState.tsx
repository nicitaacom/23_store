"use client"

import Image from "next/image"

import useDarkModeStore from "@/store/ui/useDarkModeStore"

// Shown in the main pane when there are no open tickets at all (the narrow sidebar rail is too small for the illustration).
export function EmptyState() {
  const { isDarkMode } = useDarkModeStore()

  return (
    <main className="hidden h-full min-w-0 flex-1 items-center justify-center rounded-lg border border-border-color/35 bg-foreground/35 p-6 laptop:flex">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <Image
          className="h-[180px] w-[360px] laptop:h-[220px] laptop:w-[440px]"
          src={isDarkMode ? "/support/no-tickets-found-dark.png" : "/support/no-tickets-found-light.png"}
          alt="No tickets found"
          width={440}
          height={220}
          priority
        />
        <div className="flex flex-col gap-y-2">
          <h1 className="font-secondary text-2xl font-bold tracking-tight text-title laptop:text-4xl">No tickets yet</h1>
          <p className="text-sm leading-6 text-subTitle">New customer conversations will appear here as soon as they open a ticket.</p>
        </div>
      </div>
    </main>
  )
}
