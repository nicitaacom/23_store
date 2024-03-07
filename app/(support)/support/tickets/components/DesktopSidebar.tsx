"use client"

import { useEffect, useState } from "react"
import { find } from "lodash"

import { ITicket } from "@/interfaces/support/ITicket"
import { pusherClient } from "@/libs/pusher"
import { DesktopSidebarTicket } from "./DesktopSidebarTicket"
import { NoTicketsFound } from "./NoTicketsFound"
import { UnseenMessages } from "@/actions/getUnreadMessages"
import { useUnseenMessages } from "../../../store/useUnseenMessages"
import { useRouter } from "next/navigation"
import useToast from "@/store/ui/useToast"

interface DesktopSidebarProps {
  initialTickets: ITicket[]
  unseenMessages: UnseenMessages[]
}

export const dynamic = "force-dynamic"

export function DesktopSidebar({ initialTickets, unseenMessages }: DesktopSidebarProps) {
  const router = useRouter()
  const toast = useToast()

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

    // e.g for increasing unread messages
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

    const closeByUserHandler = (ticket: ITicket) => {
      // to fix Application error: a client-side exception has occurred (see the browser console for more information).
      router.push("/support/tickets")

      toast.show(
        "success",
        "User closed ticket",
        "You may check your stats here - TOTO - create support/statistic page",
        6000,
      )

      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
    }

    const closeBySupportHandler = (ticket: ITicket) => {
      // to fix Application error: a client-side exception has occurred (see the browser console for more information).
      router.push("/support/tickets")

      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
    }

    pusherClient.bind("tickets:open", openHandler)
    pusherClient.bind("tickets:update", updateHandler)
    pusherClient.bind("tickets:closeByUser", closeByUserHandler)
    pusherClient.bind("tickets:closeBySupport", closeBySupportHandler)
    return () => {
      pusherClient.unsubscribe("tickets")
      pusherClient.unbind("tickets:open", openHandler)
      pusherClient.unbind("tickets:update", updateHandler)
      pusherClient.unbind("tickets:closeByUser", closeByUserHandler)
      pusherClient.unbind("tickets:closeBySupport", closeBySupportHandler)
    }
  }, [increaseUnreadMessages, router, tickets, toast])

  if (tickets.length === 0) {
    return <NoTicketsFound />
  }

  function openTicket(ticketId: string) {
    resetUnreadMessages(ticketId)
    setTimeout(() => {
      router.refresh()
    }, 250)
  }

  return (
    <aside className="hidden laptop:block h-full shadow-[1px_1px_4px_rgba(0,0,0,0.5)] w-64 bg-foreground z-[101]">
      <nav className="flex flex-col">
        {tickets
          ?.slice()
          // sort by decreasing unread messages e.g from 99 to 1
          .sort((a, b) => (unreadMessages[b.id] || 0) - (unreadMessages[a.id] || 0))
          .map(ticket => (
            <DesktopSidebarTicket
              ticket={ticket}
              unseenMessagesAmount={unreadMessages[ticket.id] || 0}
              key={ticket.id}
              onClick={() => openTicket(ticket.id)}
            />
          ))}
      </nav>
    </aside>
  )
}
