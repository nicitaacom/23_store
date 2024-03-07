"use client"

import Image from "next/image"
import { BackToTickets } from "./BackToTickets"
import useDarkMode from "@/store/ui/darkModeStore"

export function ThisTicketIsCompleted({ ticketId }: { ticketId: string }) {
  const { isDarkMode } = useDarkMode()
  // TODO - create transparent bg with messages with completed ticket
  return (
    <main
      className="w-full h-full laptop:w-[calc(100%-16rem)] bg-foreground-accent flex flex-col gap-y-16 justify-center items-center
    shadow-[inset_0px_8px_6px_rgba(0,0,0,0.4)] pb-8 z-[100]">
      <Image
        className="hidden mobile:block ml-6 w-[360px] h-[180px] laptop:w-[480px] laptop:h-[240px]"
        src={isDarkMode ? "/ticket-completed-dark.png" : "/ticket-completed-light.png"}
        alt="No ticket id found"
        width={480}
        height={240}
        priority
      />
      <div className="flex flex-col gap-y-2 px-8">
        <h1 className="text-lg laptop:text-2xl text-center ">Ticket with id {ticketId} is completed</h1>
        <BackToTickets />
      </div>
    </main>
  )
}
