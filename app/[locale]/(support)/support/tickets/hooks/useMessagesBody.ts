"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { TMessageDB } from "@/ts/support/TMessageDB"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useSubscribeToTicketMessages } from "@/hooks/support/useSubscribeToTicketMessages"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"
import useUser from "@/store/user/useUser"

interface UseMessagesBodyProps {
  initialMessages: TMessageDB[]
  ticketId: string
}

export const useMessagesBody = ({ initialMessages, ticketId }: UseMessagesBodyProps) => {
  const bottomRef = useRef<HTMLUListElement>(null)
  const { user } = useUser()
  const { resetUnreadMessages } = useUnseenMessages()
  const [messages, setMessages] = useState(initialMessages)
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages)

  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages)
    setMessages(initialMessages)
  }

  useEffect(() => {
    if (document.visibilityState !== "visible" || !user?.id || messages.length === 0) return

    void supportSDK.markMessagesAsSeen({ ticketId, messages, userId: user.id })
  }, [messages, ticketId, user?.id])

  const handleSeen = useCallback(() => resetUnreadMessages(ticketId), [resetUnreadMessages, ticketId])

  useSubscribeToTicketMessages({
    bottomRef,
    isEnabled: true,
    messages,
    onSeen: handleSeen,
    setMessages,
    ticketId,
  })

  return {
    bottomRef,
    messages,
  }
}
