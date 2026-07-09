"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { twMerge } from "tailwind-merge"

import { ITicketDB } from "@/ts/support/ITicketDB"
import { getTicketRowTimeLabel } from "@/utils/support/getTicketRowTimeLabel"
import useSender from "@/hooks/ui/useSender"
import useTicket from "@/hooks/support/useTicket"
import { ImageWithFallback } from "@/components/ui/ImageWithFallback"

interface SidebarTicketRowProps {
  ticket: ITicketDB
  unseenMessagesAmount: number
  onClick: () => void
}

export function SidebarTicketRow({ ticket, unseenMessagesAmount, onClick }: SidebarTicketRowProps) {
  const { ticketId } = useTicket()
  const { avatar_url } = useSender(ticket.owner_avatar_url, ticket.owner_id)

  const isActive = ticketId === ticket.id
  const hasUnread = unseenMessagesAmount > 0

  return (
    <motion.li
      className="relative"
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 34 }, opacity: { duration: 0.12 } }}>
      <Link
        className={twMerge(
          "group flex items-start gap-2 rounded-md border border-transparent bg-background/20 px-2.5 py-2.5 transition-colors duration-150 hover:border-border-color/35 hover:bg-foreground",
          hasUnread && "border-success-accent/25 bg-success-accent/[0.06]",
          isActive && "border-border-color/45 bg-background/60",
        )}
        href={`/support/tickets/${ticket.id}`}
        onClick={onClick}>
        <ImageWithFallback
          className="h-10 w-10 rounded-md object-cover"
          src={avatar_url}
          alt="Owner avatar"
          width={40}
          height={40}
          sizes="40px"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-title">{ticket.owner_username}</h3>
            <span className="shrink-0 text-[10px] tabular-nums text-subTitle/75">
              {getTicketRowTimeLabel(ticket.last_message_at ?? ticket.created_at)}
            </span>
          </div>
          <div className="mt-1 flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-subTitle">{ticket.last_message_body || "No messages yet"}</p>
            {hasUnread && (
              <span className="shrink-0 rounded border border-success-accent/30 bg-success-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-success-accent">
                {unseenMessagesAmount > 99 ? "99+" : unseenMessagesAmount}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-subTitle/75">
            <span>Ticket</span>
            <span className="h-1 w-1 rounded-full bg-subTitle/40" />
            <span>#{ticket.id.slice(0, 8)}</span>
          </div>
        </div>
        {hasUnread && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-success-accent" />}
      </Link>
    </motion.li>
  )
}
