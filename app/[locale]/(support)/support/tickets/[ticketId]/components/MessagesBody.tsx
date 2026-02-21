"use client"

import { useEffect, useRef, useState } from "react"
import { find } from "lodash"
import axios from "axios"

import { TAPIMessageSeen } from "@/api/message/seen/route"
import { IMessageDB } from "@/ts/support/IMessageDB"
import useUserStore from "@/store/user/userStore"
import { getPusherClient } from "@/libs/pusher"
import { MessageBox } from "@/components/SupportButton/components/MessageBox"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"
import { useScopedI18n } from "@/locales/client"

interface MessagesBodyProps {
  initialMessages: IMessageDB[]
  ticket_id: string
}

export const dynamic = "force-dynamic"

export function MessagesBody({ initialMessages, ticket_id }: MessagesBodyProps) {
  const t = useScopedI18n("support")
  const bottomRef = useRef<HTMLUListElement>(null)
  const { userId } = useUserStore()
  const { resetUnreadMessages } = useUnseenMessages()

  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    if (document.visibilityState === "visible") {
      axios.post("/api/message/seen", { ticketId: ticket_id, messages: messages, userId: userId } as TAPIMessageSeen)
    }
  }, [messages, ticket_id, userId])

  useEffect(() => {
    const pusherClient = getPusherClient()
    pusherClient.subscribe(ticket_id)

    if (bottomRef.current) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }

    const newHandler = (message: IMessageDB) => {
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

    const seenHandler = (updatedMessages: IMessageDB[]) => {
      // here is might be required chaning logic because I don't remember how it works
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
        <p>{t("no_messages_in_this_ticket")}</p>
        <p>
          {t("how_you_got_this_error")} - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}
        </p>
      </main>
    )
  }

  return (
    <ul className="w-full h-full flex gap-y-2 flex-col justify-start items-end px-8 py-6 overflow-y-auto" ref={bottomRef}>
      {messages.map(message => (
        <MessageBox inverseColors={true} message={message} key={message.id} />
      ))}
    </ul>
  )
}
