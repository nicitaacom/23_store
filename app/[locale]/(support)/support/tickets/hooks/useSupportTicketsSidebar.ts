"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { UnseenMessages } from "@/actions/getUnreadMessages"
import { getPusherClient, subscribePusherChannel } from "@/libs/pusher"
import useToast from "@/store/ui/useToast"
import { ITicketDB } from "@/ts/support/ITicketDB"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"

interface UseSupportTicketsSidebarProps {
  initialTickets: ITicketDB[]
  unseenMessages: UnseenMessages[]
}

const addTicket = (currentTickets: ITicketDB[], ticket: ITicketDB) =>
  currentTickets.some(currentTicket => currentTicket.id === ticket.id) ? currentTickets : [...currentTickets, ticket]

const updateTicket = (currentTickets: ITicketDB[], ticket: ITicketDB) =>
  currentTickets.map(currentTicket =>
    currentTicket.id === ticket.id
      ? {
          ...currentTicket,
          last_message_body: ticket.last_message_body,
        }
      : currentTicket,
  )

const removeTicket = (currentTickets: ITicketDB[], ticketId: string) => currentTickets.filter(ticket => ticket.id !== ticketId)

export const useSupportTicketsSidebar = ({ initialTickets, unseenMessages }: UseSupportTicketsSidebarProps) => {
  const router = useRouter()
  const { show } = useToast()
  const [tickets, setTickets] = useState(initialTickets)
  const { unreadMessages, setUnreadMessages, resetUnreadMessages, increaseUnreadMessages } = useUnseenMessages()

  useEffect(() => {
    setTickets(initialTickets)
  }, [initialTickets])

  useEffect(() => {
    setUnreadMessages(unseenMessages)
  }, [setUnreadMessages, unseenMessages])

  useEffect(() => {
    const pusherClient = getPusherClient()
    const channelName = "tickets"

    subscribePusherChannel(channelName)

    const handleOpen = (ticket: ITicketDB) => setTickets(currentTickets => addTicket(currentTickets, ticket))

    const handleUpdate = (ticket: ITicketDB) => {
      setTickets(currentTickets => updateTicket(currentTickets, ticket))
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
    () => tickets.slice().sort((left, right) => (unreadMessages[right.id] || 0) - (unreadMessages[left.id] || 0)),
    [tickets, unreadMessages],
  )

  const handleOpenTicket = useCallback(
    (ticketId: string) => {
      resetUnreadMessages(ticketId)

      setTimeout(() => {
        router.refresh()
      }, 250)
    },
    [resetUnreadMessages, router],
  )

  return {
    handleOpenTicket,
    sortedTickets,
    ticketsAmount: tickets.length,
    unreadMessages,
  }
}
