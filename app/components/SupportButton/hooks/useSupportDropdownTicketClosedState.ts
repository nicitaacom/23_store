"use client"

import { useCallback, useState } from "react"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { useSubscribeToTicketClosed } from "@/hooks/support/useSubscribeToTicketClosed"

export const useSupportDropdownTicketClosedState = (
  ticketId: string | null,
  setMessages: (messages: IMessageDB[]) => void,
) => {
  const [isClosedBySupport, setIsClosedBySupport] = useState(false)
  const [prevTicketId, setPrevTicketId] = useState(ticketId)

  if (ticketId !== prevTicketId) {
    setPrevTicketId(ticketId)
    setIsClosedBySupport(false)
  }

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
