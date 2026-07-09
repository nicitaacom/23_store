"use client"

import { useCallback, useEffect, useState } from "react"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { useSubscribeToTicketClosed } from "@/hooks/support/useSubscribeToTicketClosed"

export const useSupportDropdownTicketClosedState = (
  ticketId: string | null,
  setMessages: (messages: IMessageDB[]) => void,
) => {
  const [isClosedBySupport, setIsClosedBySupport] = useState(false)

  useEffect(() => {
    setIsClosedBySupport(false)
  }, [ticketId])

  const handleCloseByUser = useCallback(() => {
    setIsClosedBySupport(false)
    setMessages([])
  }, [setMessages])

  const handleCloseBySupport = useCallback(() => {
    setIsClosedBySupport(true)
    setMessages([])
  }, [setMessages])

  useSubscribeToTicketClosed({
    isEnabled: !!ticketId,
    onCloseBySupport: handleCloseBySupport,
    onCloseByUser: handleCloseByUser,
    ticketId,
  })

  return {
    isClosedBySupport,
  }
}
