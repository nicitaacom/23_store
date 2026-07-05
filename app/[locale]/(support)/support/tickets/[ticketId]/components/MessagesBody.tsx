"use client"

import { Fragment } from "react"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { MessageBox } from "@/components/SupportButton/components/MessageBox"
import { useScopedI18n } from "@/locales/client"
import { getSupportMessageDayLabel, isSupportMessageSameDay } from "@/utils/support/getSupportMessageDayLabel"
import { useMessagesBody } from "../../hooks/useMessagesBody"

interface MessagesBodyProps {
  initialMessages: IMessageDB[]
  ticket_id: string
}

export const dynamic = "force-dynamic"

export function MessagesBody({ initialMessages, ticket_id }: MessagesBodyProps) {
  const t = useScopedI18n("support")
  const { bottomRef, messages } = useMessagesBody({ initialMessages, ticketId: ticket_id })

  if (messages.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-4">
        <div className="max-w-md rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center">
          <p className="font-secondary text-lg font-semibold tracking-tight text-title">{t("no_messages_in_this_ticket")}</p>
          <p className="mt-2 text-sm text-subTitle">
            {t("how_you_got_this_error")} - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-0 flex-1 bg-background/35 px-3 py-3 laptop:px-4">
      <ul className="panel-scroll flex h-full w-full flex-col gap-3 overflow-y-auto pr-1" ref={bottomRef}>
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {(index === 0 || !isSupportMessageSameDay(messages[index - 1].created_at, message.created_at)) && (
              <li className="flex justify-center py-1">
                <span className="rounded border border-border-color/35 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-subTitle">
                  {getSupportMessageDayLabel(message.created_at)}
                </span>
              </li>
            )}
            <MessageBox showTimezone={true} message={message} />
          </Fragment>
        ))}
      </ul>
    </div>
  )
}
