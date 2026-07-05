"use client"

import Image from "next/image"
import { BackToTickets } from "./BackToTickets"
import useDarkModeStore from "@/store/ui/useDarkModeStore"

export function NoTicketFound({ ticketId }: { ticketId: string }) {
  const { isDarkMode } = useDarkModeStore()

  return (
    <main className="flex h-full min-w-0 flex-1 items-center justify-center rounded-lg border border-border-color/35 bg-foreground/35 px-6 py-8">
      <div className="flex max-w-xl flex-col items-center gap-6 px-6 py-8 text-center">
        <Image
          className="hidden h-[180px] w-[360px] mobile:block laptop:h-[220px] laptop:w-[440px]"
          src={isDarkMode ? "/no-ticket-with-ticketId-found-dark.png" : "/no-ticket-with-ticketId-found-light.png"}
          alt="No ticket id found"
          width={480}
          height={240}
        />
        <div className="flex flex-col gap-y-2 px-2">
          <p className="font-primary text-[11px] font-semibold uppercase tracking-[0.28em] text-success/85">Support workspace</p>
          <h1 className="mt-2 font-secondary text-2xl font-bold tracking-tight text-title laptop:text-4xl">No ticket found</h1>
          <p className="text-sm leading-6 text-subTitle">The conversation with id {ticketId} may have been closed, deleted, or the link is no longer valid.</p>
          <BackToTickets />
        </div>
      </div>
    </main>
  )
}
