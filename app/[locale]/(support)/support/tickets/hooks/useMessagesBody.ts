"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useSubscribeToTicketMessages } from "@/hooks/support/useSubscribeToTicketMessages"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"
import useUserStore from "@/store/user/userStore"

interface UseMessagesBodyProps {
  initialMessages: IMessageDB[]
  ticketId: string
}

export const useMessagesBody = ({ initialMessages, ticketId }: UseMessagesBodyProps) => {
  const bottomRef = useRef<HTMLUListElement>(null)
  const { user } = useUserStore()
  const { resetUnreadMessages } = useUnseenMessages()
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

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
