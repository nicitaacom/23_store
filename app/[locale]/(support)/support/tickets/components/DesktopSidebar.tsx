"use client"

import { AnimatePresence } from "framer-motion"
import { FiSearch } from "react-icons/fi"

import { ITicketDB } from "@/ts/support/ITicketDB"
import { SidebarTicketRow } from "./SidebarTicketRow"
import { useScopedI18n } from "@/locales/client"
import { SearchInput } from "@/components/ui/Inputs/SearchInput"

interface DesktopSidebarProps {
  onOpenTicket: (ticketId: string) => void
  tickets: ITicketDB[]
  ticketsAmount: number
  unreadMessages: Record<string, number>
  searchQuery: string
  setSearchQuery: (searchQuery: string) => void
}

// http://localhost:6006/?path=/story/support-supportdashboard--desktop-ticket-list
export function DesktopSidebar({ onOpenTicket, tickets, ticketsAmount, unreadMessages, searchQuery, setSearchQuery }: DesktopSidebarProps) {
  const t = useScopedI18n("support")

  return (
    <aside className="hidden h-full w-[320px] shrink-0 laptop:flex">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-color/35 bg-foreground/5">
        <div className="border-b border-border-color/35 px-3 py-3">
          <p className="font-primary text-[10px] font-semibold uppercase tracking-[0.18em] text-success">Support inbox</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate font-secondary text-xl font-bold tracking-tight text-title">Open tickets</h2>
            <span className="shrink-0 rounded border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              {ticketsAmount}
            </span>
          </div>
          <p className="mt-1 text-xs text-subTitle">Unread conversations stay pinned at the top.</p>
          <SearchInput
            className="mt-3 h-9"
            startIcon={<FiSearch size={16} />}
            placeholder={t("search_placeholder")}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            autoFocus={false}
          />
        </div>
        {tickets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-3">
            <div className="w-full rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center">
              {searchQuery.trim() ? (
                <p className="text-sm text-subTitle">{t("no_search_results")}</p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-title">No tickets yet</p>
                  <p className="mt-1 text-sm text-subTitle">New customer conversations will appear here as soon as they open a ticket.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <nav className="panel-scroll min-h-0 flex-1 overflow-y-auto p-2">
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false} mode="popLayout">
                {tickets.map(ticket => (
                  <SidebarTicketRow
                    key={ticket.id}
                    onClick={() => onOpenTicket(ticket.id)}
                    ticket={ticket}
                    unseenMessagesAmount={unreadMessages[ticket.id] || 0}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </nav>
        )}
      </div>
    </aside>
  )
}
