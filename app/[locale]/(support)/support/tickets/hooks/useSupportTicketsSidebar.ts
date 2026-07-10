"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { ITicketDB } from "@/ts/support/ITicketDB"
import { getPusherClient, subscribePusherChannel } from "@/libs/pusher"
import useToast from "@/store/ui/useToast"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"
import { UnseenMessages } from "@/actions/getUnreadMessages"

interface UseSupportTicketsSidebarProps {
  initialTickets: ITicketDB[]
  unseenMessages: UnseenMessages[]
}

function addTicket(currentTickets: ITicketDB[], ticket: ITicketDB) {
  return currentTickets.some(currentTicket => currentTicket.id === ticket.id) ? currentTickets : [...currentTickets, ticket]
}

function updateTicket(currentTickets: ITicketDB[], ticket: ITicketDB) {
  return currentTickets.map(currentTicket =>
    currentTicket.id === ticket.id
      ? {
          ...currentTicket,
          last_message_body: ticket.last_message_body,
          last_message_at: new Date().toISOString(),
        }
      : currentTicket,
  )
}

function removeTicket(currentTickets: ITicketDB[], ticketId: string) {
  return currentTickets.filter(ticket => ticket.id !== ticketId)
}

function getTicketTime(ticket: ITicketDB) {
  return new Date(ticket.last_message_at ?? ticket.created_at).getTime()
}

export const useSupportTicketsSidebar = ({ initialTickets, unseenMessages }: UseSupportTicketsSidebarProps) => {
  const router = useRouter()
  const { show } = useToast()
  const [tickets, setTickets] = useState(initialTickets)
  const [prevInitialTickets, setPrevInitialTickets] = useState(initialTickets)
  const [searchQuery, setSearchQuery] = useState("")
  const { unreadMessages, setUnreadMessages, resetUnreadMessages, increaseUnreadMessages } = useUnseenMessages()

  // When each ticket's unread arrived, so the sort can put the freshest unread on top (see the sort comment below).
  const [unreadArrivedAt, setUnreadArrivedAt] = useState<Record<string, number>>({})

  if (initialTickets !== prevInitialTickets) {
    setPrevInitialTickets(initialTickets)
    setTickets(initialTickets)
  }

  useEffect(() => {
    setUnreadMessages(unseenMessages)
  }, [setUnreadMessages, unseenMessages])

  useEffect(() => {
    const pusherClient = getPusherClient()
    const channelName = "tickets"

    subscribePusherChannel(channelName)

    const handleOpen = (ticket: ITicketDB) => setTickets(currentTickets => addTicket(currentTickets, ticket))

    // The send route only fires tickets:update for user -> support messages (support replies fire messages:new on the
    // ticket channel instead), so every update here is an incoming user message that must bump the support unread badge.
    const handleUpdate = (ticket: ITicketDB) => {
      setTickets(currentTickets => updateTicket(currentTickets, ticket))
      setUnreadArrivedAt(current => ({ ...current, [ticket.id]: Date.now() }))
      increaseUnreadMessages(ticket.id)
    }

    const handleCloseByUser = (ticket: ITicketDB) => {
      router.push("/support/tickets")
      show("success", "User closed ticket", "You may check your stats here - TOTO - create support/statistic page", 6000)
      setTickets(currentTickets => removeTicket(currentTickets, ticket.id))
    }

    const handleCloseBySupport = (ticket: ITicketDB) => {
      router.push("/support/tickets")
      setTickets(currentTickets => removeTicket(currentTickets, ticket.id))
    }

    pusherClient.unbind("tickets:open")
    pusherClient.bind("tickets:open", handleOpen)
    pusherClient.unbind("tickets:update")
    pusherClient.bind("tickets:update", handleUpdate)
    pusherClient.unbind("tickets:closeByUser")
    pusherClient.bind("tickets:closeByUser", handleCloseByUser)
    pusherClient.unbind("tickets:closeBySupport")
    pusherClient.bind("tickets:closeBySupport", handleCloseBySupport)

    return () => {
      pusherClient.unbind("tickets:open", handleOpen)
      pusherClient.unbind("tickets:update", handleUpdate)
      pusherClient.unbind("tickets:closeByUser", handleCloseByUser)
      pusherClient.unbind("tickets:closeBySupport", handleCloseBySupport)
      pusherClient.unsubscribe(channelName)
    }
  }, [increaseUnreadMessages, router, show])

  const sortedTickets = useMemo(
    () =>
      tickets.slice().sort((left, right) => {
        const leftUnread = (unreadMessages[left.id] || 0) > 0
        const rightUnread = (unreadMessages[right.id] || 0) > 0
        // freshest unread first — Margulan thin-pancakes: you want to eat fresh pancakes instead of 1 day old pancake that is not fresh anymore; also an old unread often means the user already resolved the issue themselves and it's no longer relevant
        if (leftUnread && rightUnread) {
          const leftArrived = unreadArrivedAt[left.id] ?? getTicketTime(left)
          const rightArrived = unreadArrivedAt[right.id] ?? getTicketTime(right)
          return rightArrived - leftArrived
        }
        if (leftUnread !== rightUnread) return leftUnread ? -1 : 1
        return getTicketTime(right) - getTicketTime(left)
      }),
    [tickets, unreadMessages, unreadArrivedAt],
  )

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sortedTickets
    return sortedTickets.filter(
      ticket =>
        ticket.owner_username.toLowerCase().includes(query) ||
        (ticket.last_message_body || "").toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query),
    )
  }, [searchQuery, sortedTickets])

  const handleOpenTicket = useCallback(
    (ticketId: string) => {
      resetUnreadMessages(ticketId)
    },
    [resetUnreadMessages],
  )

  return {
    handleOpenTicket,
    filteredTickets,
    searchQuery,
    setSearchQuery,
    ticketsAmount: tickets.length,
    unreadMessages,
  }
}
