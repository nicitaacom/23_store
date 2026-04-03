"use client"

import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import { find } from "lodash"

import { useRouter } from "next/navigation"
import { ITicketDB } from "@/ts/support/ITicketDB"
import { UnseenMessages } from "@/actions/getUnreadMessages"
import { getPusherClient } from "@/libs/pusher"
import useTicket from "@/hooks/support/useTicket"
import { MobileSidebarTicket } from "./MobileSidebarTicket"
import useToast from "@/store/ui/useToast"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"

interface MobileSidebarProps {
  initialTickets: ITicketDB[]
  unseenMessages: UnseenMessages[]
}

export function MobileSidebar({ initialTickets, unseenMessages }: MobileSidebarProps) {
  const [tickets, setTickets] = useState(initialTickets)

  const router = useRouter()
  const toast = useToast()

  const { unreadMessages, setUnreadMessages, resetUnreadMessages } = useUnseenMessages()

  useEffect(() => {
    setUnreadMessages(unseenMessages)
  }, [unseenMessages, setUnreadMessages])

  useEffect(() => {
    const pusherClient = getPusherClient()
    pusherClient.subscribe("tickets")

    const newHandler = (ticket: ITicketDB) => {
      setTickets(current => {
        if (find(current, { id: ticket.id })) {
          return current
        }

        return [...current, ticket]
      })
    }

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
    }

    const closeBySupportHandler = (ticket: ITicketDB) => {
      // to fix Application error: a client-side exception has occurred (see the browser console for more information).
      router.push("/support/tickets")
      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
    }

    const closeHandler = (ticket: ITicketDB) => {
      router.push("/support/tickets")
      toast.show("success", "User closed ticket", "You may check your stats here - TOTO - create support/statistic page", 6000)
      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
      // to fix Application error: a client-side exception has occurred (see the browser console for more information).
    }

    pusherClient.bind("tickets:open", newHandler)
    pusherClient.bind("tickets:update", updateHandler)
    pusherClient.bind("tickets:closeByUser", closeHandler)
    pusherClient.bind("tickets:closeBySupport", closeBySupportHandler)

    return () => {
      pusherClient.unsubscribe("tickets")
      pusherClient.unbind("tickets:open", newHandler)
      pusherClient.unbind("tickets:update", updateHandler)
      pusherClient.unbind("tickets:closeByUser", closeHandler)
      pusherClient.unbind("tickets:closeBySupport", closeBySupportHandler)
    }
  }, [router, toast])

  const { isOpen } = useTicket()

  return (
    <aside className={twMerge("block h-full w-full laptop:hidden", isOpen && "hidden")}>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-color/35 bg-foreground/45">
        <div className="border-b border-border-color/35 px-4 py-5">
          <p className="font-primary text-[11px] font-semibold uppercase tracking-[0.28em] text-success">Support inbox</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-secondary text-2xl font-bold tracking-tight text-title">Open tickets</h2>
              <p className="mt-1 text-sm text-subTitle">Tap a ticket to open the conversation.</p>
            </div>
            <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              {tickets.length}
            </span>
          </div>
        </div>
        {tickets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-xs text-center">
              <p className="font-secondary text-xl font-semibold text-title">No tickets yet</p>
              <p className="mt-2 text-sm leading-6 text-subTitle">New customer conversations will appear here as soon as they open a ticket.</p>
            </div>
          </div>
        ) : (
          <nav className="panel-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {tickets
            ?.slice()
            .sort((a, b) => (unreadMessages[b.id] || 0) - (unreadMessages[a.id] || 0))
            .map(ticket => (
              <MobileSidebarTicket
                ticket={ticket}
                unseenMessagesAmount={unreadMessages[ticket.id] || 0}
                key={ticket.id}
                onClick={() => resetUnreadMessages(ticket.id)}
              />
            ))}
          </nav>
        )}
      </div>
    </aside>
  )
}
