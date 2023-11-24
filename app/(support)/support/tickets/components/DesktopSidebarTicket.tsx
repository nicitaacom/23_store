"use client"
import useTicket from "@/hooks/support/useTicket"
import useSender from "@/hooks/ui/useSender"
import { ITicket } from "@/interfaces/ITicket"
import Image from "next/image"
import Link from "next/link"
import { twMerge } from "tailwind-merge"

interface DesktopSidebarTicketProps {
  ticket: ITicket
  unseenMessagesAmount: number
  onClick: () => void
}

export function DesktopSidebarTicket({ ticket, unseenMessagesAmount, onClick }: DesktopSidebarTicketProps) {
  const { ticketId } = useTicket()

  const { avatar_url } = useSender(ticket.owner_avatar_url, ticket.owner_id)

  return (
    <Link
      className={twMerge(
        `relative flex flex-row gap-x-2 px-4 py-2 hover:bg-foreground-accent duration-150 cursor-pointer pr-12 border-b border-border-color`,
        ticketId === ticket.id && "bg-brand/20",
      )}
      href={`/support/tickets/${ticket.id}`}
      key={ticket.id}
      onClick={onClick}>
      <Image
        className="w-[32px] h-[32px] rounded-full"
        src={avatar_url}
        alt="owner_avatar_url"
        width={32}
        height={32}
      />
      <div className="flex flex-col max-w-full pr-8">
        <h3 className={twMerge(`font-semibold truncate`, unseenMessagesAmount === 0 && "text-subTitle")}>
          {ticket.owner_username}
        </h3>
        <p className="text-sm truncate">{ticket.last_message_body}</p>
        {unseenMessagesAmount > 0 && (
          <>
            <div
              className={`before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-140%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-175%] after:z-[9]`}
            />
            <div className="absolute w-[20px] text-center right-0 translate-x-[-50%] translate-y-[37.5%] z-[11] text-title-foreground">
              {unseenMessagesAmount > 99 ? 99 : unseenMessagesAmount}
            </div>
          </>
        )}
      </div>
    </Link>
  )
}
