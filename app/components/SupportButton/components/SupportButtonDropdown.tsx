"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { find } from "lodash"

import { IMessage } from "@/interfaces/support/IMessage"
import { pusherClient } from "@/libs/pusher"
import useUserStore from "@/store/user/userStore"

import { MessageBox } from "../components/MessageBox"
import { MessageInput } from "../../ui/Inputs/MessageInput"
import { IFormDataMessage } from "@/interfaces/support/IFormDataMessage"
import { sendMessage } from "@/functions/sendMessage"
import { getAnonymousId } from "@/functions/getAnonymousId"
import { useLoadInitialMessages } from "@/hooks/ui/supportButton/useLoadInitialMessages"
import { useMarkMessagesAsSeen } from "@/hooks/ui/supportButton/markMessagesAsSeen"
import { useScrollToBottom } from "@/hooks/ui/supportButton/useScrollToBottom"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import { MarkTicketAsCompletedUser } from "../components/MarkTicketAsCompletedUser"

export default function SupportButtonDropdown() {
  const { isDropdown } = useSupportDropdownClose()

  const router = useRouter()
  const bottomRef = useRef<HTMLUListElement>(null)
  const userStore = useUserStore()
  const userId = userStore.userId || getAnonymousId()
  const senderUsername = userStore.username || userId
  const { ticketId, initialMessages, isLoading } = useLoadInitialMessages()

  const { handleSubmit, register, reset, setFocus } = useForm<IFormDataMessage>()
  const [messages, setMessages] = useState<IMessage[]>(initialMessages)
  useMarkMessagesAsSeen(isDropdown, ticketId, messages, userId)
  useScrollToBottom(setFocus, bottomRef, isDropdown)

  useEffect(() => {
    pusherClient.subscribe(ticketId)
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
        return current?.map(existingMessage => {
          const updatedMessage = updatedMessages.find(msg => msg.id === existingMessage.id)
          return updatedMessage ? updatedMessage : existingMessage
        })
      })
    }

    const closeHandler = () => {
      setMessages([])
    }

    pusherClient.bind("messages:new", newHandler) // show new msg and scrollToBottom
    pusherClient.bind("messages:seen", seenHandler) // set 'seen:true'
    pusherClient.bind("tickets:closeByUser", closeHandler) // to clear messages
    pusherClient.bind("tickets:closeBySupport", closeHandler) // to clear messages

    return () => {
      pusherClient.unsubscribe(ticketId)
      pusherClient.unbind("messages:new", newHandler)
      pusherClient.unbind("messages:seen", seenHandler)
      pusherClient.unbind("tickets:closeByUser", closeHandler)
      pusherClient.unbind("tickets:closeBySupport", closeHandler)
    }
  }, [messages, ticketId, router])

  function sendMessageFn(data: IFormDataMessage) {
    sendMessage({
      data,
      reset,
      messages,
      ticketId,
      userId,
      senderUsername,
      avatarUrl: userStore.avatarUrl,
      router,
      setMessages,
      bottomRef,
    })
  }

  return (
    <section className="h-[400px] mobile:h-[490px] w-[280px] mobile:w-[375px] flex flex-col justify-between">
      <div className="w-full shadow-md py-1 flex justify-end items-center px-2">
        <h1 className="absolute left-[50%] translate-x-[-50%] text-[1.1rem] mobile:text-[1.4rem] font-semibold">
          Response ~15s
        </h1>
        <MarkTicketAsCompletedUser messagesLength={messages?.length ?? 0} ticketId={ticketId} />
      </div>
      {isLoading ? (
        <div>TODO - loading messages...</div>
      ) : (
        <form
          className="flex flex-col justify-between h-[calc(400px-56px)] mobile:h-[calc(490px-56px)]"
          onSubmit={handleSubmit(sendMessageFn)}>
          <ul className="h-[280px] mobile:h-[370px] flex flex-col gap-y-2 hide-scrollbar p-4" ref={bottomRef}>
            {messages?.map(message => <MessageBox key={message.id} message={message} />)}
          </ul>
          <MessageInput
            //-2px because it don't calculate border-width 1px
            className="px-4 py-2 bg-foreground-accent shadow-md"
            id="message"
            register={register}
          />
        </form>
      )}
    </section>
  )
}
