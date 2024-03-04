import { TAPIMessageSend } from "@/api/message/send/route"
import { TAPITicketsOpen } from "@/api/tickets/open/route"
import { IFormDataMessage } from "@/interfaces/support/IFormDataMessage"
import { IMessage } from "@/interfaces/support/IMessage"
import axios from "axios"
import { UseFormReset } from "react-hook-form"
import { telegramMessage } from "@/constant/telegram"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { Dispatch, RefObject, SetStateAction } from "react"
import { TAPITelegram } from "@/api/telegram/route"
import { find } from "lodash"

interface sendMessageProps {
  data: IFormDataMessage
  reset: UseFormReset<IFormDataMessage>
  messages: IMessage[]
  ticketId: string
  userId: string
  senderUsername: string
  avatarUrl: string
  router: AppRouterInstance
  setMessages: Dispatch<SetStateAction<IMessage[]>>
  bottomRef: RefObject<HTMLUListElement>
}

export async function sendMessage({
  data,
  reset,
  messages,
  ticketId,
  userId,
  senderUsername,
  avatarUrl,
  router,
  setMessages,
  bottomRef,
}: sendMessageProps) {
  // Insert a new ticketId and send message in telegram if no open ticket is found

  if (data.message.length === 0) {
    return null
  }

  reset()
  if (messages?.length === 0) {
    // all this code required to fix issue when I send 2 first messages in < 1 second
    const firstMessageId = crypto.randomUUID()

    // dance arounding to insert current date-time
    const now = new Date()
    const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

    const newMessage = {
      id: firstMessageId, // needed to set in cuurent pusher channel (for key prop in react)
      created_at: timestampString,
      ticket_id: ticketId,
      sender_id: userId!,
      sender_username: senderUsername!,
      senderAvatarUrl: avatarUrl,
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
      ownerId: userId!,
      ownerUsername: senderUsername!,
      messageBody: data.message,
      ownerAvatarUrl: avatarUrl,
    } as TAPITicketsOpen)
    // 2. Insert message in table 'messages'
    await axios.post("/api/message/send", {
      id: firstMessageId,
      ticketId: ticketId,
      senderId: userId,
      senderUsername: senderUsername,
      senderAvatarUrl: avatarUrl,
      body: data.message,
      images: undefined,
    } as TAPIMessageSend)
    // 3. Send message in telegram
    await axios.post("/api/telegram", { message: telegramMessage } as TAPITelegram)
    router.refresh()
  } else {
    // 1. Insert message in table 'messages'
    await axios.post("/api/message/send", {
      ticketId: ticketId,
      senderId: userId,
      senderUsername: senderUsername,
      senderAvatarUrl: avatarUrl,
      body: data.message,
      images: undefined,
    } as TAPIMessageSend)
    // 2. Scroll to bottom to show last messages
    if (bottomRef.current) {
      bottomRef.current?.scrollTo(0, bottomRef.current.scrollHeight)
      bottomRef.current.scrollIntoView()
    }
  }
}
