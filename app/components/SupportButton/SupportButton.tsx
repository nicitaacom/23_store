"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BiSupport } from "react-icons/bi"
import { find } from "lodash"
import axios from "axios"

import { IMessage } from "@/interfaces/IMessage"
import { TAPITelegram } from "@/api/telegram/route"
import { pusherClient } from "@/libs/pusher"
import { getCookie } from "@/utils/helpersCSR"
import useUserStore from "@/store/user/userStore"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import { telegramMessage } from "@/constant/telegram"

import { Input } from "../ui/Inputs"
import { Button, DropdownContainer } from "../ui"
import { MessageBox } from "./components/MessageBox"
import { TAPIMessages } from "@/api/messages/route"

interface SupportButtonProps {
  ticketId: string
  initialMessages: IMessage[]
}

export function SupportButton({ ticketId, initialMessages }: SupportButtonProps) {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState(initialMessages)
  const [userMessage, setUserMessage] = useState("")
  const userStore = useUserStore()

  const senderId = userStore.userId || getCookie("anonymousId")

  //Timeout needed for focus and scroll to bottom - without it foucs and scrollToBottom doesn't work
  useEffect(() => {
    if (isDropdown && !ticketId) {
      ;(async () => {
        await axios.post("/api/telegram", { message: telegramMessage } as TAPITelegram)
        router.refresh()
      })()
    }

    setTimeout(() => {
      inputRef.current?.focus()
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

    pusherClient.bind("messages:new", messagehandler)

    return () => {
      pusherClient.unsubscribe(ticketId)
      pusherClient.unbind("messages:new", messagehandler)
    }
  }, [ticketId])

  async function sendMessage(e: React.FormEvent) {
    // Return a new ticketId if no open ticket is found

    e.preventDefault()
    setUserMessage("")
    if (ticketId && senderId) {
      axios.post("/api/messages", {
        body: userMessage,
        ticketId: ticketId,
        senderId: senderId,
      } as TAPIMessages)

      if (bottomRef.current) {
        bottomRef.current?.scrollTo(0, bottomRef.current.scrollHeight)
        bottomRef.current.scrollIntoView()
      }
    } else {
      console.log("no ticketId or userId")
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
        <h1 className="text-center text-[1.4rem] font-semibold shadow-md py-1">Response ~15s</h1>
        <form className="flex flex-col justify-between h-full" onSubmit={sendMessage}>
          <div className="h-[385px] flex flex-col gap-y-2 hide-scrollbar p-4" ref={bottomRef}>
            {messages.map((initialMessage, index) => (
              <MessageBox key={initialMessage.id} isLast={index === initialMessages.length - 1} data={initialMessage} />
            ))}
          </div>
          <Input
            //-2px because it don't calculate border-width 1px
            className="w-[calc(100%-2px)] px-4 py-2 bg-foreground-accent shadow-md"
            value={userMessage}
            onChange={e => setUserMessage(e.target.value)}
            placeholder="Enter your message..."
            ref={inputRef}
          />
        </form>
      </section>
    </DropdownContainer>
  )
}
