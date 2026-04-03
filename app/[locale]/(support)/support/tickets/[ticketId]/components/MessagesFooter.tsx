"use client"

import { FormEvent, useState } from "react"
import axios from "axios"
import { FiSend } from "react-icons/fi"
import useUserStore from "@/store/user/userStore"
import { TAPIMessageSend } from "@/api/message/send/route"
import { getUserAvatarUrl, getUserName } from "@/utils/user"

export function MessagesFooter({ ticket_id }: { ticket_id: string }) {
  const { user } = useUserStore()
  const [message, setMessage] = useState("")

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const trimmedMessage = message.trim()

    if (!trimmedMessage) return

    setMessage("")
    await axios.post("/api/message/send", {
      messageBody: trimmedMessage,
      ticketId: ticket_id,
      senderId: user?.id,
      senderUsername: getUserName(user),
      senderAvatarUrl: getUserAvatarUrl(user),
      // TODO - images logic in the future
      images: undefined,
      messageSender: "support",
    } as TAPIMessageSend)
  }

  return (
    <form className="border-t border-white/8 bg-[#171922] px-4 py-4" onSubmit={sendMessage}>
      <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-[#20232d] px-4 py-3 shadow-[0_12px_26px_rgba(0,0,0,0.24)]">
        <input
          className="h-10 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          value={message}
          onChange={event => setMessage(event.target.value)}
          tabIndex={0}
          placeholder="Type a reply..."
          autoFocus
        />
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_10px_22px_rgba(124,58,237,0.22)] transition-transform duration-150 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!message.trim()}
          type="submit">
          <FiSend size={16} />
        </button>
      </div>
    </form>
  )
}
