"use client"

import { twMerge } from "tailwind-merge"

import { ITicketDB } from "@/ts/support/ITicketDB"
import useTicket from "@/hooks/support/useTicket"
import { MobileSidebarTicket } from "./MobileSidebarTicket"

interface MobileSidebarProps {
  onOpenTicket: (ticketId: string) => void
  tickets: ITicketDB[]
  ticketsAmount: number
  unreadMessages: Record<string, number>
}

export function MobileSidebar({ onOpenTicket, tickets, ticketsAmount, unreadMessages }: MobileSidebarProps) {
  const { isOpen } = useTicket()

  return (
    <aside className={twMerge("block h-full w-full laptop:hidden", isOpen && "hidden")}>
      <div className="flex h-full flex-col overflow-hidden rounded-md border border-border-color/35 bg-foreground/5">
        <div className="border-b border-border-color/35 px-3 py-3">
          <p className="font-primary text-[10px] font-semibold uppercase tracking-[0.18em] text-success">Support inbox</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <h2 className="font-secondary text-xl font-bold tracking-tight text-title">Open tickets</h2>
              <p className="mt-1 text-xs text-subTitle">Tap a ticket to open the conversation.</p>
            </div>
            <span className="rounded border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              {ticketsAmount}
            </span>
          </div>
        </div>
        {tickets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-3">
            <div className="w-full rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center">
              <p className="font-secondary text-lg font-semibold text-title">No tickets yet</p>
              <p className="mt-1 text-sm text-subTitle">New customer conversations will appear here as soon as they open a ticket.</p>
            </div>
          </div>
        ) : (
          <nav className="panel-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
            {tickets.map(ticket => (
              <MobileSidebarTicket
                key={ticket.id}
                onClick={() => onOpenTicket(ticket.id)}
                ticket={ticket}
                unseenMessagesAmount={unreadMessages[ticket.id] || 0}
              />
            ))}
          </nav>
        )}
      </div>
    </aside>
  )
}
