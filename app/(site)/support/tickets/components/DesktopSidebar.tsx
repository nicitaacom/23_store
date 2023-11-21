"use client"

import useTicket from "@/hooks/support/useTicket"
import { ITicket } from "@/interfaces/ITicket"
import { pusherClient } from "@/libs/pusher"
import { find } from "lodash"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"

interface DesktopSidebarProps {
  initialTickets: ITicket[]
}

export function DesktopSidebar({ initialTickets }: DesktopSidebarProps) {
  const { ticketId } = useTicket()

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

    pusherClient.bind("tickets:new", newHandler)
    pusherClient.bind("tickets:update", updateHandler)
    // TODO - delete ticket and update it in sidebar

    return () => {
      pusherClient.unsubscribe("tickets")
      pusherClient.unbind("tickets:new", newHandler)
      pusherClient.unbind("tickets:new", updateHandler)
    }
  }, [tickets])

  // TODO - return no open tickes found TSX

  return (
    <aside className="hidden laptop:block h-full shadow-[1px_3px_5px_rgba(0,0,0,0.5)] w-64 bg-foreground z-[99]">
      <nav className="flex flex-col">
        {tickets?.map((ticket, index) => (
          <Link
            className={twMerge(
              `relative px-4 py-2 hover:bg-foreground-accent duration-150 cursor-pointer pr-12 border-b border-border-color`,
              ticketId === ticket.id && "bg-brand/20",
            )}
            href={`/support/tickets/${ticket.id}`}
            key={ticket.id}>
            <h3 className="font-semibold truncate">{ticket.owner_username}</h3>
            <p className="text-sm truncate">{ticket.last_message_body}</p>
            <div
              className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
              before:right-2 before:translate-y-[-150%] before:z-[9]
              after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
              after:right-2.5 after:translate-y-[-185%] after:z-[9] after:content-['99']"
            />
          </Link>
        ))}
      </nav>
    </aside>
  )
}
