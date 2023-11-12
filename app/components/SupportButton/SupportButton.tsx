"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BiSupport } from "react-icons/bi"
import axios from "axios"

import { pusherClient } from "@/libs/pusher"
import { IMessage } from "@/interfaces/IMessage"
import { getCookie } from "@/utils/helpersCSR"
import useUserStore from "@/store/user/userStore"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import { Input } from "../ui/Inputs"

import { Button, DropdownContainer } from "../ui"
import { MessageBox } from "./components/MessageBox"
import { find } from "lodash"

interface SupportButtonProps {
  conversationId: string
  initialMessages: IMessage[]
}

export function SupportButton({ conversationId, initialMessages }: SupportButtonProps) {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState(initialMessages)
  const [userMessage, setUserMessage] = useState("")
  const userStore = useUserStore()

  const senderId = userStore.userId ? userStore.userId : getCookie("anonymousId")

  //Timeout needed for focus and scroll to bottom - without it foucs and scrollToBottom doesn't work
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()

      if (bottomRef.current) {
        bottomRef.current.scrollTop = bottomRef.current.scrollHeight
      }
    }, 25)
  }, [isDropdown])

  useEffect(() => {
    pusherClient.subscribe(conversationId)
    if (bottomRef.current) {
      bottomRef.current.scrollTop = bottomRef.current.scrollHeight
    }

    const messagehandler = (message: IMessage) => {
      //axios.post('api/messages/{conversationId}/seen')
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
      pusherClient.unsubscribe(conversationId)
      pusherClient.unbind("messages:new", messagehandler)
    }
  }, [conversationId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    setUserMessage("")
    if (conversationId && senderId) {
      axios.post("/api/messages", { body: userMessage, conversationId: conversationId, senderId: senderId })

      if (bottomRef.current) {
        bottomRef.current.scrollTop = bottomRef.current.scrollHeight
        bottomRef.current.scrollIntoView()
      }
    } else {
      console.log(32, "no senderId")
    }
  }

  //before:translate-y-[402px] should be +2px then <section className="h-[400px]
  //w-[400px] should be = section w-[400px]
  return (
    <DropdownContainer
      className="w-[400px] top-[-585px] translate-x-[-30px] before:translate-y-[492px]
       before:border-l-0 before:border-t-0 before:border-r before:border-b"
      classNameIsDropdownTrue="translate-y-[-4px]"
      classNameIsDropdownFalse="translate-y-[5px]"
      isDropdown={isDropdown}
      toggle={toggle}
      dropdownRef={supportDropdownRef}
      icon={
        <Button
          className="w-[48px] h-[48px] desktop:w-[64px] desktop:h-[64px] fixed bottom-4 right-6 rounded-full border border-border-color"
          variant="outline">
          <BiSupport className="text-icon-color w-[24px] h-[24px] desktop:w-[32px] desktop:h-[32px]" />
        </Button>
      }>
      <section className="h-[490px] w-[400px] px-4 py-4 flex flex-col justify-between">
        <h1 className="text-center text-[1.4rem] font-semibold">Response ~15s</h1>
        <form className="flex flex-col gap-y-2 justify-between h-full pb-8" onSubmit={sendMessage}>
          <div className="flex flex-col gap-y-2 hide-scrollbar pb-4" ref={bottomRef}>
            {messages.map((initialMessage, index) => (
              <MessageBox key={initialMessage.id} isLast={index === initialMessages.length - 1} data={initialMessage} />
            ))}
          </div>
          <Input
            className="w-full"
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
