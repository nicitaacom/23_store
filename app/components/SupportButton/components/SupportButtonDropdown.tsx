"use client"

import { Fragment, useEffect, useRef } from "react"
import { BiSupport } from "react-icons/bi"

import { DragAndDropArea } from "./DragAndDropArea/DragAndDropArea"
import { IMessageDB } from "@/ts/support/IMessageDB"
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
import { getPusherClient } from "@/libs/pusher"
import { useScopedI18n } from "@/locales/client"

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

  useEffect(() => {
    const pusherClient = getPusherClient()

    if (!userId || !isDropdown || !ticketId) return

    pusherClient.subscribe(ticketId)

    if (bottomRef.current) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }

    const newMessageHandler = (message: IMessageDB) => {
      const messageExists = messages.some(currentMessage => currentMessage.id === message.id)
      setMessages(messageExists ? messages : [...messages, message])

      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollTop = bottomRef.current.scrollHeight
        }
      }, 10)
    }

    const seenHandler = (updatedMessages: IMessageDB[]) => {
      setMessages(messages.map(message => updatedMessages.find(updatedMessage => updatedMessage.id === message.id) || message))
    }

    const closeHandler = () => {
      setMessages([])
    }

    pusherClient.bind("messages:new", newMessageHandler)
    pusherClient.bind("messages:seen", seenHandler)
    pusherClient.bind("tickets:closeByUser", closeHandler)
    pusherClient.bind("tickets:closeBySupport", closeHandler)

    return () => {
      pusherClient.unsubscribe(ticketId)
      pusherClient.unbind("messages:new", newMessageHandler)
      pusherClient.unbind("messages:seen", seenHandler)
      pusherClient.unbind("tickets:closeByUser", closeHandler)
      pusherClient.unbind("tickets:closeBySupport", closeHandler)
    }
  }, [isDropdown, messages, setMessages, ticketId, userId])

  return (
    <section className="relative flex h-[440px] w-[min(92vw,390px)] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#13151b] shadow-[0_28px_90px_rgba(0,0,0,0.45)] mobile:h-[540px]">
      <div className="border-b border-white/8 bg-[#171922] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
              <BiSupport size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-100 mobile:text-lg">Support chat</h1>
              <p className="mt-0.5 text-xs text-slate-500">{t("response_time", { number: 15 })}</p>
            </div>
          </div>
          <MarkTicketAsCompletedUser messagesLength={messages.length} ticketId={ticketId} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="rounded-[22px] border border-white/8 bg-[#1a1d26] px-5 py-4 text-center shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
            <p className="text-sm font-medium text-slate-100">{t("loading_messages")}...</p>
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#171922_0%,#101218_100%)]">
          {messages.length ? (
            <ul className="panel-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" ref={bottomRef}>
              {messages.map((message, index) => (
                <Fragment key={message.id}>
                  {(index === 0 || !isSameDay(messages[index - 1].created_at, message.created_at)) && (
                    <li className="flex justify-center py-1">
                      <span className="rounded-full border border-white/8 bg-[#20232d] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
                        {getDayLabel(message.created_at)}
                      </span>
                    </li>
                  )}
                  <MessageBox message={message} />
                </Fragment>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 items-center justify-center px-5 py-6">
              <div className="max-w-[260px] rounded-[24px] border border-white/8 bg-[#1a1d26] px-5 py-6 text-center shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
                <p className="text-base font-semibold text-slate-100">Support is ready</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t("no_messages_yet")}.</p>
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
