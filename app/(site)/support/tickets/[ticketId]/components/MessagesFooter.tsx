"use client"

import { NextResponse } from "next/server"

import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { MessageInput } from "../../components"
import { Input } from "@/components/ui/Inputs"
import { FormEvent, useState } from "react"
import axios from "axios"
import useUserStore from "@/store/user/userStore"

export function MessagesFooter({ ticket_id }: { ticket_id: string }) {
  // Server component with input and server action doesn't work because I need to set input value to ""
  const userStore = useUserStore()
  const [message, setMessage] = useState("")

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    await axios.post("/api/messages", {
      body: message,
      ticketId: ticket_id,
      senderId: userStore.userId,
      senderUsername: userStore.username,
      // TODO - images logic in the future
      images: null,
    })
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
