"use client"

import { useEffect, useState } from "react"
import { find } from "lodash"

import { ITicketDB } from "@/ts/support/ITicketDB"
import { DesktopSidebarTicket } from "./DesktopSidebarTicket"
import { NoTicketsFound } from "./NoTicketsFound"
import { UnseenMessages } from "@/actions/getUnreadMessages"
import { useUnseenMessages } from "../../../store/useUnseenMessages"
import { useRouter } from "next/navigation"
import useToast from "@/store/ui/useToast"
import { getPusherClient } from "@/libs/pusher"

interface DesktopSidebarProps {
  initialTickets: ITicketDB[]
  unseenMessages: UnseenMessages[]
}

export const dynamic = "force-dynamic"

export function DesktopSidebar({ initialTickets, unseenMessages }: DesktopSidebarProps) {
  const router = useRouter()
  const toast = useToast()

  const [tickets, setTickets] = useState(initialTickets)
  const { unreadMessages, setUnreadMessages, resetUnreadMessages, increaseUnreadMessages } = useUnseenMessages()

  useEffect(() => {
    setUnreadMessages(unseenMessages)
  }, [unseenMessages, setUnreadMessages])

  useEffect(() => {
    const pusherClient = getPusherClient()
    pusherClient.subscribe("tickets")

    const openHandler = (ticket: ITicketDB) => {
      setTickets(current => {
        if (find(current, { id: ticket.id })) {
          return current
        }

        return [...current, ticket]
      })
    }

    // e.g for increasing unread messages
    const updateHandler = (ticket: ITicketDB) => {
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

    const closeByUserHandler = (ticket: ITicketDB) => {
      // to fix Application error: a client-side exception has occurred (see the browser console for more information).
      router.push("/support/tickets")

      toast.show("success", "User closed ticket", "You may check your stats here - TOTO - create support/statistic page", 6000)

      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
    }

    const closeBySupportHandler = (ticket: ITicketDB) => {
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
  }, [increaseUnreadMessages, router, toast])

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
    <aside className="hidden h-full w-[320px] shrink-0 laptop:flex">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border-color/35 bg-foreground/45">
        <div className="border-b border-border-color/35 px-5 py-5">
          <p className="font-primary text-[11px] font-semibold uppercase tracking-[0.28em] text-success">Support inbox</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-secondary text-2xl font-bold tracking-tight text-title">Open tickets</h2>
              <p className="mt-1 text-sm text-subTitle">Unread conversations stay pinned at the top.</p>
            </div>
            <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              {tickets.length}
            </span>
          </div>
        </div>
        <nav className="panel-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {tickets
          ?.slice()
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
      </div>
    </aside>
  )
}
