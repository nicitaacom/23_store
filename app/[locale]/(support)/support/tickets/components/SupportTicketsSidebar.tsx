"use client"

import { ITicketDB } from "@/ts/support/ITicketDB"
import { useSupportTicketsSidebar } from "../hooks/useSupportTicketsSidebar"
import { DesktopSidebar } from "./DesktopSidebar"
import { MobileSidebar } from "./MobileSidebar"
import { UnseenMessages } from "@/actions/getUnreadMessages"

interface SupportTicketsSidebarProps {
  initialTickets: ITicketDB[]
  unseenMessages: UnseenMessages[]
}

export function SupportTicketsSidebar({ initialTickets, unseenMessages }: SupportTicketsSidebarProps) {
  const { handleOpenTicket, filteredTickets, searchQuery, setSearchQuery, ticketsAmount, unreadMessages } = useSupportTicketsSidebar({
    initialTickets,
    unseenMessages,
  })

  return (
    <>
      <DesktopSidebar
        onOpenTicket={handleOpenTicket}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        tickets={filteredTickets}
        ticketsAmount={ticketsAmount}
        unreadMessages={unreadMessages}
      />
      <MobileSidebar
        onOpenTicket={handleOpenTicket}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        tickets={filteredTickets}
        ticketsAmount={ticketsAmount}
        unreadMessages={unreadMessages}
      />
    </>
  )
}
