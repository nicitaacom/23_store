"use client"

import { useEffect, useRef, useState } from "react"
import { BiSupport } from "react-icons/bi"

import { IMessage } from "@/interfaces/IMessage"
import { getCookie } from "@/utils/helpersCSR"
import useUserStore from "@/store/user/userStore"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import supabaseClient from "@/libs/supabaseClient"
import { Input } from "../ui/Inputs"
import { Button, DropdownContainer } from "../ui"

import { MessageBox } from "./components/MessageBox"

interface SupportButtonProps {
  conversationId: string
  initialMessages: IMessage[]
}

export function SupportButton({ conversationId, initialMessages }: SupportButtonProps) {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  const inputRef = useRef<HTMLInputElement>(null)
  const [userMessage, setUserMessage] = useState("")
  const userStore = useUserStore()

  const senderId = userStore.userId ? userStore.userId : getCookie("anonymousId")

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
      //Timeout needed for focus - without it foucs doesn't work
    }, 25)
  }, [isDropdown])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (conversationId && senderId) {
      const { data, error } = await supabaseClient
        .from("messages")
        .insert({ body: userMessage, sender_id: senderId, conversation_id: conversationId })
      console.log(29, "data - ", data)
      console.log(30, "error - ", error)
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
        <form className="flex flex-col gap-y-2 justify-between h-full" onSubmit={sendMessage}>
          <div className="flex flex-col gap-y-2">
            {initialMessages.map((initialMessage, index) => (
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
