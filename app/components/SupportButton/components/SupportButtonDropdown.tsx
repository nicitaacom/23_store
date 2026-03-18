"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

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
import { getPusherClient } from "@/libs/pusher"
import { useScopedI18n } from "@/locales/client"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

export default function SupportButtonDropdown() {
  const t = useScopedI18n("support")

  const dropDownRef = useRef<HTMLDivElement>(null)
  const [isShowDropdown, setIsShowDropdown] = useState(false)

  function closeDropdown() {
    setIsShowDropdown(false)
  }

  useEscOrClickOutside(dropDownRef, closeDropdown)

  const router = useRouter()
  const bottomRef = useRef<HTMLUListElement>(null)
  const { user } = useUserStore()
  const userId = user?.id || getAnonymousId()
  const { isLoading } = useLoading()

  const { messages, ticketId, setMessages } = useMessagesStore()
  useMarkMessagesAsSeen(isShowDropdown, ticketId, messages, userId, isLoading)
  useScrollToBottom(bottomRef, isShowDropdown)

  useEffect(() => {
    const pusherClient = getPusherClient()
    // I want to initialize connection with pusher only in case isDropdown and userId
    // because user may be not authenticated and that's why I set anonymousId when user send first message
    if (userId && isShowDropdown && ticketId) {
      pusherClient.subscribe(ticketId)
      if (bottomRef.current) {
        bottomRef.current.scrollTop = bottomRef.current.scrollHeight
      }

      const newMessageHandler = (message: IMessageDB) => {
        // Check if the message with the same id already exists
        const messageExists = messages.some(msg => msg.id === message.id)

        // Update the state based on whether the message exists or not
        setMessages(messageExists ? messages : [...messages, message])

        //Timeout is required here because without it scroll to bottom doesn't work
        setTimeout(() => {
          if (bottomRef.current) {
            bottomRef.current.scrollTop = bottomRef.current.scrollHeight
          }
        }, 10)
      }

      const seenHandler = (updatedMessages: IMessageDB[]) => {
        setMessages(
          messages.map(existingMessage => updatedMessages.find(msg => msg.id === existingMessage.id) || existingMessage),
        )
      }

      const closeHandler = () => {
        setMessages([])
      }

      pusherClient.bind("messages:new", newMessageHandler) // show new msg and scrollToBottom
      pusherClient.bind("messages:seen", seenHandler) // set 'seen:true'
      pusherClient.bind("tickets:closeByUser", closeHandler) // to clear messages
      pusherClient.bind("tickets:closeBySupport", closeHandler) // to clear messages

      return () => {
        pusherClient.unsubscribe(ticketId)
        pusherClient.unbind("messages:new", newMessageHandler)
        pusherClient.unbind("messages:seen", seenHandler)
        pusherClient.unbind("tickets:closeByUser", closeHandler)
        pusherClient.unbind("tickets:closeBySupport", closeHandler)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, ticketId, router])

  return (
    <section
      className="relative h-[400px] mobile:h-[490px] w-[280px] mobile:w-[375px] flex flex-col bg-foreground-accent
     rounded-lg overflow-hidden shadow-lg">
      <div className="w-full bg-foreground border-b border-border-color py-3 flex justify-center items-center px-8 relative">
        <h1 className="text-[1.1rem] mobile:text-[1.4rem] font-semibold text-title">{t("response_time", { number: 15 })}</h1>
        <div className="absolute right-4 z-20">
          <MarkTicketAsCompletedUser messagesLength={messages?.length ?? 0} ticketId={ticketId} />
        </div>
      </div>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-subTitle">{t("loading_messages")}...</div>
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pt-6 z-20">
          {messages.length ? (
            <ul className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-2" ref={bottomRef}>
              {messages?.map(message => <MessageBox key={message.id} message={message} />)}
            </ul>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-subTitle text-sm">{t("no_messages_yet")}.</p>
            </div>
          )}
          <MessageInput />
        </div>
      )}
    </section>
  )
}
