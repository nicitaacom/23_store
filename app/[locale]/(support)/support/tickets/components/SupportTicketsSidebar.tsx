"use client"

import { IUnseenMessages } from "@/ts/interfaces/IUnseenMessages"
import { ITicketDB } from "@/ts/support/ITicketDB"
import { useSupportTicketsSidebar } from "../hooks/useSupportTicketsSidebar"
import { DesktopSidebar } from "./DesktopSidebar"
import { MobileSidebar } from "./MobileSidebar"

interface SupportTicketsSidebarProps {
  initialTickets: ITicketDB[]
  unseenMessages: IUnseenMessages[]
}

// http://localhost:6006/?path=/story/support-supportdashboard--desktop-ticket-list
export function SupportTicketsSidebar({ initialTickets, unseenMessages }: SupportTicketsSidebarProps) {
  const { handleOpenTicket, filteredTickets, searchQuery, setSearchQuery, ticketsAmount, unreadMessages } =
    useSupportTicketsSidebar({
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
