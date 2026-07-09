"use client"

import { RefObject, useEffect, useRef } from "react"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { getPusherClient, subscribePusherChannel } from "@/libs/pusher"

interface UseSubscribeToTicketMessagesProps {
  bottomRef: RefObject<HTMLUListElement>
  isEnabled: boolean
  messages: IMessageDB[]
  onSeen?: (updatedMessages: IMessageDB[]) => void
  setMessages: (messages: IMessageDB[]) => void
  ticketId: string | null
}

export const useSubscribeToTicketMessages = ({
  bottomRef,
  isEnabled,
  messages,
  onSeen,
  setMessages,
  ticketId,
}: UseSubscribeToTicketMessagesProps) => {
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!isEnabled || !ticketId) return

    const pusherClient = getPusherClient()
    const channelName = ticketId

    subscribePusherChannel(channelName)

    const scrollToBottomFn = () => {
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollTop = bottomRef.current.scrollHeight
        }
      }, 10)
    }

    scrollToBottomFn()

    const handleNewMessage = (message: IMessageDB) => {
      const hasMessage = messagesRef.current.some(currentMessage => currentMessage.id === message.id)
      if (hasMessage) return

      const nextMessages = [...messagesRef.current, message]

      messagesRef.current = nextMessages
      setMessages(nextMessages)
      scrollToBottomFn()
    }

    const handleSeen = (updatedMessages: IMessageDB[]) => {
      const nextMessages = messagesRef.current.map(
        message => updatedMessages.find(updatedMessage => updatedMessage.id === message.id) || message,
      )

      messagesRef.current = nextMessages
      setMessages(nextMessages)
      onSeen?.(updatedMessages)
    }

    pusherClient.unbind("messages:new")
    pusherClient.bind("messages:new", handleNewMessage)
    pusherClient.unbind("messages:seen")
    pusherClient.bind("messages:seen", handleSeen)

    return () => {
      pusherClient.unbind("messages:new", handleNewMessage)
      pusherClient.unbind("messages:seen", handleSeen)
      pusherClient.unsubscribe(channelName)
    }
  }, [bottomRef, isEnabled, onSeen, setMessages, ticketId])
}
