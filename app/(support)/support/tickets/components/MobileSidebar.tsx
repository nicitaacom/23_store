"use client"

import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import { find } from "lodash"

import { ITicket } from "@/interfaces/support/ITicket"
import { UnseenMessages } from "@/actions/getUnreadMessages"
import { useUnseenMessages } from "@/(support)/store/useUnseenMessages"
import { pusherClient } from "@/libs/pusher"
import useTicket from "@/hooks/support/useTicket"
import { MobileSidebarTicket } from "./MobileSidebarTicket"
import { useRouter } from "next/navigation"
import useToast from "@/store/ui/useToast"

interface MobileSidebarProps {
  initialTickets: ITicket[]
  unseenMessages: UnseenMessages[]
}

export function MobileSidebar({ initialTickets, unseenMessages }: MobileSidebarProps) {
  const [tickets, setTickets] = useState(initialTickets)

  const router = useRouter()
  const toast = useToast()

  const { unreadMessages, setUnreadMessages, resetUnreadMessages } = useUnseenMessages()
  useEffect(() => {
    // Call the setUnreadMessages function when needed
    setUnreadMessages(unseenMessages)
  }, [unseenMessages, setUnreadMessages])

  // TODO - go to /support/tickets on esc

  useEffect(() => {
    pusherClient.subscribe("tickets")

    const newHandler = (ticket: ITicket) => {
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
    }

    const closeBySupportHandler = (ticket: ITicket) => {
      // to fix Application error: a client-side exception has occurred (see the browser console for more information).
      router.push("/support/tickets")
      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })
    }

    const closeHandler = (ticket: ITicket) => {
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
  }, [router, tickets, toast])

  const { isOpen } = useTicket()

  return (
    <aside className={twMerge(`block laptop:hidden w-full h-full`, isOpen && "hidden")}>
      <nav className="flex flex-col gap-y-4 justify-center items-center px-16">
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

        {/* TODO - create case if messages more then 99 - show 99 */}
      </nav>
    </aside>
  )
}
