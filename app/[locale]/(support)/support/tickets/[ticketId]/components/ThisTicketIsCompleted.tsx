"use client"

import Image from "next/image"
import { BackToTickets } from "./BackToTickets"
import useDarkModeStore from "@/store/ui/useDarkModeStore"

export function ThisTicketIsCompleted({ ticketId }: { ticketId: string }) {
  const { isDarkMode } = useDarkModeStore()

  return (
    <main className="flex h-full min-w-0 flex-1 items-center justify-center rounded-lg border border-border-color/35 bg-foreground/35 px-6 py-8">
      <div className="flex max-w-xl flex-col items-center gap-6 px-6 py-8 text-center">
        <Image
          className="hidden h-[180px] w-[360px] mobile:block laptop:h-[220px] laptop:w-[440px]"
          src={isDarkMode ? "/ticket-completed-dark.png" : "/ticket-completed-light.png"}
          alt="No ticket id found"
          width={480}
          height={240}
          priority
        />
        <div className="flex flex-col gap-y-2 px-2">
          <h1 className="mt-2 font-secondary text-2xl font-bold tracking-tight text-title laptop:text-4xl">Ticket closed</h1>
          <p className="text-sm leading-6 text-subTitle">
            Ticket {ticketId} is already closed, so this conversation now lives in the archived support workspace.
          </p>
          <BackToTickets />
        </div>
      </div>
    </main>
  )
}
