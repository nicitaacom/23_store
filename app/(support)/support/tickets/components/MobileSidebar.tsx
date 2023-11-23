"use client"

import { useRouter } from "next/navigation"

import { ITicket } from "@/interfaces/ITicket"
import useTicket from "@/hooks/support/useTicket"
import { twMerge } from "tailwind-merge"
import { useEffect, useState } from "react"
import { find } from "lodash"
import { pusherClient } from "@/libs/pusher"
import { MobileSidebarTicket } from "./MobileSidebarTicket"

interface MobileSidebarProps {
  initialTickets: ITicket[]
}

export function MobileSidebar({ initialTickets }: MobileSidebarProps) {
  const router = useRouter()

  const [tickets, setTickets] = useState(initialTickets)

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

    const closeHandler = (ticket: ITicket) => {
      setTickets(current => {
        return [...current.filter(tckt => tckt.id !== ticket.id)]
      })

      // if (ticketId === ticket.id) {
      //   router.push("/support/tickets")
      // }
    }

    pusherClient.bind("tickets:open", newHandler)
    pusherClient.bind("tickets:update", updateHandler)
    pusherClient.bind("tickets:close", closeHandler)

    return () => {
      pusherClient.unsubscribe("tickets")
      pusherClient.unbind("tickets:open", newHandler)
      pusherClient.unbind("tickets:update", updateHandler)
      pusherClient.unbind("tickets:close", closeHandler)
    }
  }, [tickets])

  const { isOpen } = useTicket()

  return (
    <aside className={twMerge(`block laptop:hidden w-full h-full`, isOpen && "hidden")}>
      <nav className="flex flex-col gap-y-4 justify-center items-center px-16">
        {tickets?.map(ticket => <MobileSidebarTicket ticket={ticket} key={ticket.id} />)}

        {/* TODO - create case if messages more then 99 - show 99 */}

        {/* UNREAD (sort - unread first) */}
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
      </nav>
    </aside>
  )
}