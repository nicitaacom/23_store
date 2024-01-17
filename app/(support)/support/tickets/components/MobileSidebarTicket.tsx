"use client"
import { ITicket } from "@/interfaces/support/ITicket"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"

interface MobileSidebarTicketProps {
  ticket: ITicket
  unseenMessagesAmount: number
  onClick: () => void
}

export function MobileSidebarTicket({ ticket, unseenMessagesAmount, onClick }: MobileSidebarTicketProps) {
  const router = useRouter()

  function openTicket() {
    onClick()
    router.push(`/support/tickets/${ticket.id}`)
  }

  return (
    <li
      className="relative w-full border border-border-color text-center pl-4 pr-8 py-2"
      key={ticket.id}
      onClick={openTicket}>
      <h3 className={twMerge(`font-semibold truncate`, unseenMessagesAmount === 0 && "text-subTitle")}>
        {ticket.owner_username}
      </h3>
      {unseenMessagesAmount > 0 && (
        <>
          <div
            className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-100%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-120%] after:z-[9]"
          />
          <div className="absolute w-[20px] text-center right-0 translate-x-[-50%] translate-y-[-100%] z-[11] text-title-foreground">
            {unseenMessagesAmount > 99 ? 99 : unseenMessagesAmount}
          </div>
        </>
      )}
    </li>
  )
}
