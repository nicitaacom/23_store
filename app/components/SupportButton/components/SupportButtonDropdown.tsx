"use client"

import { Fragment, useRef } from "react"
import { BiSupport } from "react-icons/bi"

import { DragAndDropArea } from "./DragAndDropArea/DragAndDropArea"
import { OrganicCanvasBackground } from "@/components/OrganicCanvasBackground"
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

  // messages present on first render are the initial load and must not animate; only later arrivals pop in
  const initialIdsRef = useRef(new Set(messages.map(message => message.id)))

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
    <section className="relative flex h-[440px] w-[min(92vw,390px)] flex-col overflow-hidden rounded-lg border border-border-color/35 bg-modal-surface shadow-compact-lg mobile:h-[540px]">
      <OrganicCanvasBackground
        className="h-auto shrink-0 overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.06),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))]"
        parentClassName="relative flex items-start justify-between gap-2 px-3 py-3"
        particleCount={2}
        brandHsl="137, 82%, 52%"
        canvasOpacity={0.4}
        verticalOverflow={12}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/16 bg-white/8 text-success-accent">
            <BiSupport size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85">Support</p>
            <h1 className="text-[16px] font-semibold text-white mobile:text-[18px]">{t("ready_title")}</h1>
            <p className="mt-0.5 text-[11px] text-white/55">{t("response_time", { number: 15 })}</p>
          </div>
        </div>
        <MarkTicketAsCompletedUser
          isClosedBySupport={isClosedBySupport}
          key={ticketId || "empty-ticket"}
          messagesLength={messages.length}
          ticketId={ticketId}
        />
      </OrganicCanvasBackground>

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
                  <MessageBox animateEntry={!initialIdsRef.current.has(message.id)} message={message} />
                </Fragment>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 py-5">
              <div className="max-w-[260px] rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center">
                <p className="text-base font-semibold text-title">{t("ready_title")}</p>
                <p className="mt-2 text-sm text-subTitle">{t("no_messages_yet")}.</p>
              </div>
            </div>
          )}
          <MessageInput placeholder={t("message_placeholder")} />
        </div>
      )}

      <DragAndDropArea />
    </section>
  )
}
