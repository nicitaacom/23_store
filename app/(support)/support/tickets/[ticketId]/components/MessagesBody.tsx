"use client"

import { useEffect, useRef, useState } from "react"
import { find } from "lodash"
import axios from "axios"

import { TAPIMessagesSeen } from "@/api/messages/seen/route"
import { IMessage } from "@/interfaces/IMessage"
import { pusherClient } from "@/libs/pusher"
import { MessageBox } from "@/components/SupportButton/components/MessageBox"
import useUserStore from "@/store/user/userStore"
import { useUnseenMessages } from "@/store/ui/unseenMessages"

interface MessagesBodyProps {
  initialMessages: IMessage[]
  ticket_id: string
}

export function MessagesBody({ initialMessages, ticket_id }: MessagesBodyProps) {
  const bottomRef = useRef<HTMLUListElement>(null)
  const { userId } = useUserStore()
  const { resetUnreadMessages } = useUnseenMessages()

  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    axios.post("/api/messages/seen", { ticketId: ticket_id, messages: messages, userId: userId } as TAPIMessagesSeen)
  }, [messages, ticket_id, userId])

  useEffect(() => {
    pusherClient.subscribe(ticket_id)
    if (bottomRef.current) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }

    const newHandler = (message: IMessage) => {
      setMessages(current => {
        if (find(current, { id: message.id })) {
          return current
        }

        return [...current, message]
      })

      //Timeout is required here because without it scroll to bottom doesn't work
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollTop = bottomRef.current.scrollHeight
        }
      }, 10)
    }

    const seenHandler = (updatedMessages: IMessage[]) => {
      setMessages(current => {
        return current.map(existingMessage => {
          const updatedMessage = updatedMessages.find(msg => msg.id === existingMessage.id)
          return updatedMessage ? updatedMessage : existingMessage
        })
      })

      resetUnreadMessages(ticket_id)
    }
    pusherClient.bind("messages:new", newHandler)
    pusherClient.bind("messages:seen", seenHandler)

    return () => {
      pusherClient.unsubscribe(ticket_id)
      pusherClient.unbind("messages:new", newHandler)
      pusherClient.unbind("messages:seen", seenHandler)
    }
  }, [messages, resetUnreadMessages, ticket_id])

  if (messages.length === 0) {
    return (
      <main
        className="w-full h-full hidden laptop:flex flex-col gap-y-2 bg-foreground-accent
      justify-center items-center
    shadow-[inset_0px_8px_6px_rgba(0,0,0,0.4)] z-[100]">
        <p>No messages in this ticket</p>
        <p>Please let me know how you got this error - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      </main>
    )
  }

  // TODO - show unread messages first
  // TODO - hide blue circle with read messages (where unseenMessagesAmount === 0)
  return (
    <ul
      className="w-full h-full flex gap-y-2 flex-col justify-start items-end px-8 py-6 overflow-y-auto"
      ref={bottomRef}>
      {messages.map(message => (
        <MessageBox message={message} key={message.id} />
      ))}
    </ul>
  )
}
