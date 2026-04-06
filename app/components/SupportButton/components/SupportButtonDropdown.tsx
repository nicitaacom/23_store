"use client"

import { Fragment, useRef } from "react"
import { BiSupport } from "react-icons/bi"

import { DragAndDropArea } from "./DragAndDropArea/DragAndDropArea"
import useUserStore from "@/store/user/userStore"
import { MessageBox } from "../components/MessageBox"
import { MessageInput } from "../../ui/Inputs/MessageInput"
import { getAnonymousId } from "@/functions/getAnonymousId"
import { useMarkMessagesAsSeen } from "@/hooks/ui/supportButton/useMarkMessagesAsSeen"
import { useScrollToBottom } from "@/hooks/ui/supportButton/useScrollToBottom"
import { MarkTicketAsCompletedUser } from "../components/MarkTicketAsCompletedUser"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { useLoading } from "@/store/ui/useLoading"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { useScopedI18n } from "@/locales/client"
import { useSubscribeToTicketMessages } from "@/hooks/support/useSubscribeToTicketMessages"
import { getSupportMessageDayLabel, isSupportMessageSameDay } from "@/utils/support/getSupportMessageDayLabel"
import { useSupportDropdownTicketClosedState } from "../hooks/useSupportDropdownTicketClosedState"

export default function SupportButtonDropdown() {
  const t = useScopedI18n("support")
  const bottomRef = useRef<HTMLUListElement>(null)
  const { user } = useUserStore()
  const userId = user?.id || getAnonymousId()
  const { isLoading } = useLoading()
  const { isDropdown } = useSupportDropdown()
  const { messages, ticketId, setMessages } = useMessagesStore()

  useMarkMessagesAsSeen(isDropdown, ticketId, messages, userId, isLoading)
  useScrollToBottom(bottomRef, isDropdown)
  const { isClosedBySupport } = useSupportDropdownTicketClosedState(ticketId, setMessages)

  useSubscribeToTicketMessages({
    bottomRef,
    isEnabled: !!userId && isDropdown,
    messages,
    setMessages,
    ticketId,
  })

  return (
    <section className="relative flex h-[440px] w-[min(92vw,390px)] flex-col overflow-hidden rounded-md border border-border-color/35 bg-foreground/95 mobile:h-[540px]">
      <div className="border-b border-border-color/35 bg-background/55 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-brand/20 bg-brand/10 text-brand">
              <BiSupport size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-title mobile:text-lg">Support chat</h1>
              <p className="mt-0.5 text-xs text-subTitle">{t("response_time", { number: 15 })}</p>
            </div>
          </div>
          <MarkTicketAsCompletedUser
            isClosedBySupport={isClosedBySupport}
            key={ticketId || "empty-ticket"}
            messagesLength={messages.length}
            ticketId={ticketId}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="rounded border border-border-color/35 bg-background/35 px-4 py-3 text-center">
            <p className="text-sm font-medium text-title">{t("loading_messages")}...</p>
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col bg-background/35">
          {messages.length ? (
            <ul className="panel-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3" ref={bottomRef}>
              {messages.map((message, index) => (
                <Fragment key={message.id}>
                  {(index === 0 || !isSupportMessageSameDay(messages[index - 1].created_at, message.created_at)) && (
                    <li className="flex justify-center py-1">
                      <span className="rounded border border-border-color/35 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-subTitle">
                        {getSupportMessageDayLabel(message.created_at)}
                      </span>
                    </li>
                  )}
                  <MessageBox message={message} />
                </Fragment>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 py-5">
              <div className="max-w-[260px] rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center">
                <p className="text-base font-semibold text-title">Support is ready</p>
                <p className="mt-2 text-sm text-subTitle">{t("no_messages_yet")}.</p>
              </div>
            </div>
          )}
          <MessageInput />
        </div>
      )}

      <DragAndDropArea />
    </section>
  )
}
