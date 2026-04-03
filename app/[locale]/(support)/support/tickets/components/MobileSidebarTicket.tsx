"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"

import useSender from "@/hooks/ui/useSender"
import { ITicketDB } from "@/ts/support/ITicketDB"

interface MobileSidebarTicketProps {
  ticket: ITicketDB
  unseenMessagesAmount: number
  onClick: () => void
}

export function MobileSidebarTicket({ ticket, unseenMessagesAmount, onClick }: MobileSidebarTicketProps) {
  const router = useRouter()
  const { avatar_url } = useSender(ticket.owner_avatar_url, ticket.owner_id)

  function openTicket() {
    onClick()
    router.push(`/support/tickets/${ticket.id}`)
  }

  return (
    <li key={ticket.id}>
      <button
        className="flex w-full items-start gap-3 rounded-xl border border-transparent bg-background/30 px-3 py-3 text-left transition-all duration-200 hover:border-border-color/25 hover:bg-background/55"
        onClick={openTicket}
        type="button">
        <Image
          className="h-10 w-10 rounded-xl border border-border-color/35 object-cover"
          src={avatar_url}
          alt="Owner avatar"
          width={40}
          height={40}
          sizes="40px"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className={twMerge("min-w-0 flex-1 truncate text-sm font-semibold text-title", unseenMessagesAmount === 0 && "text-title")}>
              {ticket.owner_username}
            </h3>
            {unseenMessagesAmount > 0 && (
              <span className="rounded-full border border-info/20 bg-info/90 px-2 py-0.5 text-[11px] font-semibold leading-5 text-title-foreground">
                {unseenMessagesAmount > 99 ? "99+" : unseenMessagesAmount}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs leading-5 text-subTitle">{ticket.last_message_body || "No messages yet"}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-subTitle/75">
            <span>Ticket</span>
            <span className="h-1 w-1 rounded-full bg-subTitle/40" />
            <span>#{ticket.id.slice(0, 8)}</span>
          </div>
        </div>
      </button>
    </li>
  )
}
