"use client"

import { BiSupport } from "react-icons/bi"

import { Button, DropdownContainer } from "./ui"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import { Input } from "./ui/Inputs"
import { useState } from "react"
import supabaseClient from "@/libs/supabaseClient"
import useUserStore from "@/store/user/userStore"
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies"

export function SupportButton({ conversationId }: { conversationId: Promise<string | RequestCookie | undefined> }) {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  const [userMessage, setUserMessage] = useState("")
  const userStore = useUserStore()

  const senderId = userStore.userId ? userStore.userId : `anonymous_${crypto.randomUUID()}`

  async function sendMessage() {
    const { data, error } = await supabaseClient.from("messages").insert({ body: userMessage, sender_id: senderId })
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
          className="w-[48px] h-[48px] desktop:w-[64px] desktop:h-[64px] fixed bottom-4 right-4 rounded-full border border-border-color"
          variant="outline">
          <BiSupport className="text-icon-color w-[24px] h-[24px] desktop:w-[32px] desktop:h-[32px]" />
        </Button>
      }>
      <section className="h-[490px] w-[400px] px-4 py-4 flex flex-col justify-between">
        <h1 className="text-center text-[1.4rem] font-semibold">Response ~15s</h1>
        <form className="flex flex-row gap-x-2 items-center" onSubmit={sendMessage}>
          <Input
            className="w-full"
            value={userMessage}
            onChange={e => setUserMessage(e.target.value)}
            placeholder="Enter your message..."
          />
        </form>
      </section>
    </DropdownContainer>
  )
}
