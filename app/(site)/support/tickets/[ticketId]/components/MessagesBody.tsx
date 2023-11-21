"use client"

import { useEffect, useRef, useState } from "react"

import { IMessage } from "@/interfaces/IMessage"
import { pusherClient } from "@/libs/pusher"
import { MessageBox } from "@/components/SupportButton/components/MessageBox"
import { find } from "lodash"

interface MessagesBodyProps {
  initialMessages: IMessage[]
  ticket_id: string
}

export function MessagesBody({ initialMessages, ticket_id }: MessagesBodyProps) {
  const bottomRef = useRef<HTMLUListElement>(null)

  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    pusherClient.subscribe(ticket_id)
    if (bottomRef.current) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }

    const messagehandler = (message: IMessage) => {
      //TODO - axios.post('api/messages/{ticketId}/seen')
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

    pusherClient.bind("messages:new", messagehandler)

    return () => {
      pusherClient.unsubscribe(ticket_id)
      pusherClient.unbind("messages:new", messagehandler)
    }
  }, [messages, ticket_id])

  if (messages.length === 0) {
    return (
      <main
        className="w-full h-full laptop:w-[calc(100%-16rem)] hidden laptop:flex bg-foreground-accent
      justify-center items-center
    shadow-[inset_0px_8px_6px_rgba(0,0,0,0.4)] z-[100]">
        <p>No messages in this ticket</p>
        <p>Please let me know how you got this error - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      </main>
    )
  }

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
