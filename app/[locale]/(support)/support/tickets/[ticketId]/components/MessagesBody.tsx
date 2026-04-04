"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { find } from "lodash"

import { IMessageDB } from "@/ts/support/IMessageDB"
import useUserStore from "@/store/user/userStore"
import { getPusherClient } from "@/libs/pusher"
import { MessageBox } from "@/components/SupportButton/components/MessageBox"
import { useUnseenMessages } from "@/[locale]/(support)/store/useUnseenMessages"
import { useScopedI18n } from "@/locales/client"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"

function isSameDay(left: string, right: string) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

function getDayLabel(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()

  if (isSameDay(dateString, today.toISOString())) {
    return "Today"
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date)
}

interface MessagesBodyProps {
  initialMessages: IMessageDB[]
  ticket_id: string
}

export const dynamic = "force-dynamic"

export function MessagesBody({ initialMessages, ticket_id }: MessagesBodyProps) {
  const t = useScopedI18n("support")
  const bottomRef = useRef<HTMLUListElement>(null)
  const { user } = useUserStore()
  const { resetUnreadMessages } = useUnseenMessages()

  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    if (document.visibilityState === "visible" && user?.id) {
      void supportSDK.markMessagesAsSeen({ ticketId: ticket_id, messages, userId: user.id })
    }
  }, [messages, ticket_id, user?.id])

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
      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="max-w-md rounded-2xl border border-white/8 bg-[#1a1d26] px-6 py-7 text-center shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
          <p className="font-secondary text-2xl font-semibold tracking-tight text-slate-100">{t("no_messages_in_this_ticket")}</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {t("how_you_got_this_error")} - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,#171922_0%,#101218_100%)] px-4 py-4 laptop:px-6">
      <ul className="panel-scroll flex h-full w-full flex-col gap-4 overflow-y-auto pr-1" ref={bottomRef}>
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {(index === 0 || !isSameDay(messages[index - 1].created_at, message.created_at)) && (
              <li className="flex justify-center py-1">
                <span className="rounded-full border border-white/8 bg-[#20232d] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
                  {getDayLabel(message.created_at)}
                </span>
              </li>
            )}
            <MessageBox inverseColors={true} message={message} />
          </Fragment>
        ))}
      </ul>
    </div>
  )
}
