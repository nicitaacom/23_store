"use client"

import { useEffect } from "react"

import { getPusherClient, subscribePusherChannel } from "@/libs/pusher"

interface UseSubscribeToTicketClosedProps {
  isEnabled?: boolean
  onCloseBySupport?: () => void
  onCloseByUser?: () => void
  ticketId: string | null
}

export const useSubscribeToTicketClosed = ({
  isEnabled = true,
  onCloseBySupport,
  onCloseByUser,
  ticketId,
}: UseSubscribeToTicketClosedProps) => {
  useEffect(() => {
    if (!isEnabled || !ticketId) return

    const pusherClient = getPusherClient()
    const channelName = ticketId

    subscribePusherChannel(channelName)

    const handleCloseByUser = () => onCloseByUser?.()
    const handleCloseBySupport = () => onCloseBySupport?.()

    pusherClient.unbind("tickets:closeByUser")
    pusherClient.bind("tickets:closeByUser", handleCloseByUser)
    pusherClient.unbind("tickets:closeBySupport")
    pusherClient.bind("tickets:closeBySupport", handleCloseBySupport)

    return () => {
      pusherClient.unbind("tickets:closeByUser", handleCloseByUser)
      pusherClient.unbind("tickets:closeBySupport", handleCloseBySupport)
      pusherClient.unsubscribe(channelName)
    }
  }, [isEnabled, onCloseBySupport, onCloseByUser, ticketId])
}
