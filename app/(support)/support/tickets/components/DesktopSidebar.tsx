"use client"

import { useEffect, useState } from "react"
import { find } from "lodash"

import { ITicket } from "@/interfaces/ITicket"
import { pusherClient } from "@/libs/pusher"
import { DesktopSidebarTicket } from "./DesktopSidebarTicket"
import { NoTicketsFound } from "./NoTicketsFound"
import { UnseenMessages } from "@/actions/getUnreadMessages"
import { useUnseenMessages } from "@/store/ui/unseenMessages"

interface DesktopSidebarProps {
  initialTickets: ITicket[]
  unseenMessages: UnseenMessages[]
}

export function DesktopSidebar({ initialTickets, unseenMessages }: DesktopSidebarProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const { unreadMessages, setUnreadMessages, resetUnreadMessages, increaseUnreadMessages } = useUnseenMessages()
  useEffect(() => {
    // Call the setUnreadMessages function when needed
    setUnreadMessages(unseenMessages)
  }, [unseenMessages, setUnreadMessages])

  // TODO - go to /support/tickets on esc

  useEffect(() => {
    pusherClient.subscribe("tickets")

    const openHandler = (ticket: ITicket) => {
      setTickets(current => {
        if (find(current, { id: ticket.id })) {
          return current
        }

        return [...current, ticket]
      })
    }

    const updateHandler = (ticket: ITicket) => {
      setTickets(current =>
        current.map(currentTicket => {
          if (currentTicket.id === ticket.id) {
            return {
              ...currentTicket,
              last_message_body: ticket.last_message_body,
            }
          }
          return currentTicket
        }),
      )

      increaseUnreadMessages(ticket.id)
    }

    const closeHandler = (ticket: ITicket) => {
      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
    }

    pusherClient.bind("tickets:open", openHandler)
    pusherClient.bind("tickets:update", updateHandler)
    pusherClient.bind("tickets:close", closeHandler)
    return () => {
      pusherClient.unsubscribe("tickets")
      pusherClient.unbind("tickets:open", openHandler)
      pusherClient.unbind("tickets:update", updateHandler)
      pusherClient.unbind("tickets:close", closeHandler)
    }
  }, [increaseUnreadMessages, tickets])

  if (tickets.length === 0) {
    return <NoTicketsFound />
  }

  return (
    <aside className="hidden laptop:block h-full shadow-[1px_3px_5px_rgba(0,0,0,0.5)] w-64 bg-foreground z-[99]">
      <nav className="flex flex-col">
        {tickets?.map(ticket => (
          <DesktopSidebarTicket
            ticket={ticket}
            unseenMessagesAmount={unreadMessages[ticket.id] || 0}
            key={ticket.id}
            onClick={() => resetUnreadMessages(ticket.id)}
          />
        ))}
      </nav>
    </aside>
  )
}
