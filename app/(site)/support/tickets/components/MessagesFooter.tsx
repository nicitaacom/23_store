"use client"

import { useForm } from "react-hook-form"

import { IFormDataMessage } from "@/interfaces/IFormDataMessage"
import { MessageInput } from "."

export function MessagesFooter() {
  const { handleSubmit, register } = useForm<IFormDataMessage>()

  async function sendMessage(data: IFormDataMessage) {
    // TODO - send message logic
  }

  return (
    <form onSubmit={handleSubmit(sendMessage)}>
      <MessageInput id="message" register={register} />
    </form>
  )
}
