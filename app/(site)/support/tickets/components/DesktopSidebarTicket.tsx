"use client"
import useTicket from "@/hooks/support/useTicket"
import useSender from "@/hooks/ui/useSender"
import { ITicket } from "@/interfaces/ITicket"
import Image from "next/image"
import Link from "next/link"
import { twMerge } from "tailwind-merge"

interface DesktopSidebarTicketProps {
  ticket: ITicket
}

export function DesktopSidebarTicket({ ticket }: DesktopSidebarTicketProps) {
  const { ticketId } = useTicket()

  const { avatar_url } = useSender(ticket.owner_avatar_url, ticket.owner_id)

  return (
    <Link
      className={twMerge(
        `relative flex flex-row gap-x-2 px-4 py-2 hover:bg-foreground-accent duration-150 cursor-pointer pr-12 border-b border-border-color`,
        ticketId === ticket.id && "bg-brand/20",
      )}
      href={`/support/tickets/${ticket.id}`}
      key={ticket.id}>
      <Image src={avatar_url} alt="owner_avatar_url" width={32} height={32} />
      <div className="flex flex-col max-w-full pr-8">
        <h3 className="font-semibold truncate">{ticket.owner_username}</h3>
        <p className="text-sm truncate">{ticket.last_message_body}</p>
        <div
          className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
              before:right-2 before:translate-y-[-140%] before:z-[9]
              after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
              after:right-2.5 after:translate-y-[-175%] after:z-[9] after:content-['99']"
        />
      </div>
    </Link>
  )
}
