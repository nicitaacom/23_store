"use client"
import { ITicket } from "@/interfaces/ITicket"
import { useRouter } from "next/navigation"

interface MobileSidebarTicketProps {
  ticket: ITicket
}

export function MobileSidebarTicket({ ticket }: MobileSidebarTicketProps) {
  const router = useRouter()
  return (
    <li
      className="relative w-full border border-border-color text-center pl-4 pr-8 py-2"
      key={ticket.id}
      onClick={() => router.push(`/support/tickets/${ticket.id}`)}>
      <h3 className="font-semibold truncate">{ticket.owner_username}</h3>
      <div
        className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-100%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-120%] after:z-[9] after:content-['99']"
      />
    </li>
  )
}
