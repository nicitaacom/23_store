"use client"

import { Input } from "@/components/ui/Inputs"
import { FormEvent, useState } from "react"
import axios from "axios"
import useUserStore from "@/store/user/userStore"
import { TAPIMessageSend } from "@/api/message/send/route"

export function MessagesFooter({ ticket_id }: { ticket_id: string }) {
  // Server component with input and server action doesn't work because I need to set input value to ""
  const userStore = useUserStore()
  const [message, setMessage] = useState("")

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    await axios.post("/api/message/send", {
      messageBody: message,
      ticketId: ticket_id,
      senderId: userStore.userId,
      senderUsername: userStore.username,
      senderAvatarUrl: userStore.avatarUrl,
      // TODO - images logic in the future
      images: undefined,
      messageSender: "support",
    } as TAPIMessageSend)
  }

  return (
    <form className="w-full p-4 bg-foreground" onSubmit={e => sendMessage(e)}>
      <Input
        value={message}
        onChange={e => setMessage(e.target.value)}
        tabIndex={0}
        placeholder="Enter message..."
        autoFocus
      />
    </form>
  )
}
