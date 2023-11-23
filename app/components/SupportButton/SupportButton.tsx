"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BiSupport } from "react-icons/bi"
import { find } from "lodash"
import axios from "axios"

import { TAPIMessages } from "@/api/messages/route"
import { TAPITelegram } from "@/api/telegram/route"
import { IMessage } from "@/interfaces/IMessage"
import { pusherClient } from "@/libs/pusher"
import { getCookie } from "@/utils/helpersCSR"
import useUserStore from "@/store/user/userStore"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import { telegramMessage } from "@/constant/telegram"

import { MessageBox } from "./components/MessageBox"
import { Button, DropdownContainer } from "../ui"
import { MessageInput } from "../ui/Inputs/MessageInput"
import { useForm } from "react-hook-form"
import { IFormDataMessage } from "@/interfaces/IFormDataMessage"
import { TAPITicketsOpen } from "@/api/tickets/open/route"
import { MarkTicketAsCompletedUser } from "./components/MarkTicketAsCompletedUser"

interface SupportButtonProps {
  initialMessages: IMessage[]
  ticketId: string
}

export function SupportButton({ initialMessages, ticketId }: SupportButtonProps) {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  const router = useRouter()
  const bottomRef = useRef<HTMLUListElement>(null)
  const [messages, setMessages] = useState(initialMessages)
  const userStore = useUserStore()

  const senderId = userStore.userId || getCookie("anonymousId")
  const senderUsername = userStore.username || getCookie("anonymousId")

  const { handleSubmit, register, reset, setFocus } = useForm<IFormDataMessage>()

  useEffect(() => {
    //Timeout needed for focus and scroll to bottom - without it foucs and scrollToBottom doesn't work
    setTimeout(() => {
      setFocus("message")
      if (bottomRef.current) {
        bottomRef.current.scrollTop = bottomRef.current.scrollHeight
      }
    }, 25)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdown])

  useEffect(() => {
    pusherClient.subscribe(ticketId)
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

    const closeHandler = () => {
      setMessages([])
    }

    pusherClient.bind("messages:new", messagehandler)
    pusherClient.bind("tickets:close", closeHandler)

    return () => {
      pusherClient.unsubscribe(ticketId)
      pusherClient.unbind("messages:new", messagehandler)
      pusherClient.unbind("tickets:close", closeHandler)
    }
  }, [messages, ticketId, router])

  async function sendMessage(data: IFormDataMessage) {
    // Insert a new ticketId and send message in telegram if no open ticket is found

    if (data.message.length === 0) {
      return null
    }

    reset()
    if (messages.length === 0) {
      console.log("first message")

      // all this code required to fix issue when I send 2 first messages in < 1 second
      const firstMessageId = crypto.randomUUID()

      // dance arounding to insert current date-time
      const now = new Date()
      const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

      const newMessage = {
        id: firstMessageId, // needed to set in cuurent pusher channel (for key prop in react)
        created_at: timestampString,
        ticket_id: ticketId,
        sender_id: senderId!,
        sender_username: senderUsername!,
        senderAvatarUrl: userStore.avatarUrl,
        body: data.message,
        // TODO - add images logic in future
        images: null,
      }
      const messagehandler = (message: IMessage) => {
        //TODO - axios.post('api/messages/{ticketId}/seen')

        setMessages(current => {
          if (find(current, { id: message.id })) {
            return current
          }

          return [...current, message]
        })
      }
      messagehandler(newMessage)

      // 1. Insert row in table 'tickets'
      await axios.post("/api/tickets/open", {
        ticketId: ticketId,
        ownerId: senderId!,
        ownerUsername: senderUsername!,
        messageBody: data.message,
        ownerAvatarUrl: userStore.avatarUrl,
      } as TAPITicketsOpen)
      // 2. Insert message in table 'messages'
      await axios.post("/api/messages", {
        id: firstMessageId,
        ticketId: ticketId,
        senderId: senderId,
        senderUsername: senderUsername,
        senderAvatarUrl: userStore.avatarUrl,
        body: data.message,
        images: undefined,
      } as TAPIMessages)
      // 3. Send message in telegram
      await axios.post("/api/telegram", { message: telegramMessage } as TAPITelegram)
      router.refresh()
    } else {
      // 1. Insert message in table 'messages'
      await axios.post("/api/messages", {
        ticketId: ticketId,
        senderId: senderId,
        senderUsername: senderUsername,
        senderAvatarUrl: userStore.avatarUrl,
        body: data.message,
        images: undefined,
      } as TAPIMessages)
      // 2. Scroll to bottom to show last messages
      if (bottomRef.current) {
        bottomRef.current?.scrollTo(0, bottomRef.current.scrollHeight)
        bottomRef.current.scrollIntoView()
      }
    }
  }

  //before:translate-y-[402px] should be +2px then <section className="h-[400px]
  //w-[400px] should be = section w-[400px]
  return (
    <DropdownContainer
      className="w-[280px] mobile:w-[375px] top-[-480px] mobile:top-[-570px] desktop:top-[-585px]
       translate-x-[-32.5px] desktop:translate-x-[-40px] before:translate-y-[402px] mobile:before:translate-y-[492px]
       before:border-l-0 before:border-t-0 before:border-r before:border-b before:bg-foreground-accent before:z-[2]"
      classNameIsDropdownTrue="translate-y-[-4px]"
      classNameIsDropdownFalse="translate-y-[5px]"
      isDropdown={isDropdown}
      toggle={toggle}
      dropdownRef={supportDropdownRef}
      icon={
        <Button
          className="w-[48px] h-[48px] px-3 desktop:px-4 desktop:w-[64px] desktop:h-[64px] fixed bottom-4 right-6 rounded-full border border-border-color"
          variant="default-outline">
          <BiSupport className="text-icon-color w-[32px] h-[32px] desktop:w-[32px] desktop:h-[32px]" />
        </Button>
      }>
      <section className="h-[400px] mobile:h-[490px] w-[280px] mobile:w-[375px] flex flex-col justify-between">
        <div className="w-full shadow-md py-1 flex justify-end items-center px-2">
          <h1 className="absolute left-[50%] translate-x-[-50%] text-[1.1rem] mobile:text-[1.4rem] font-semibold">
            Response ~15s
          </h1>
          <MarkTicketAsCompletedUser messagesLength={messages.length} ticketId={ticketId} />
        </div>
        <form
          className="flex flex-col justify-between h-[calc(400px-56px)] mobile:h-[calc(490px-56px)]"
          onSubmit={handleSubmit(sendMessage)}>
          <ul className="h-[280px] mobile:h-[370px] flex flex-col gap-y-2 hide-scrollbar p-4" ref={bottomRef}>
            {messages.map(message => (
              <MessageBox key={message.id} message={message} />
            ))}
          </ul>
          <MessageInput
            //-2px because it don't calculate border-width 1px
            className="px-4 py-2 bg-foreground-accent shadow-md"
            id="message"
            register={register}
          />
        </form>
      </section>
    </DropdownContainer>
  )
}
