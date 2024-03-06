import { RefObject } from "react"
import axios, { AxiosError } from "axios"
import { UseFormReset } from "react-hook-form"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { IMessage } from "@/interfaces/support/IMessage"
import { IFormDataMessage } from "@/interfaces/support/IFormDataMessage"
import { TAPIMessageSend } from "@/api/message/send/route"
import { TAPITicketsOpen } from "@/api/tickets/open/route"
import { setCookie } from "@/utils/helpersCSR"
import { telegramMessage } from "@/constant/telegram"
import { TAPITelegram } from "@/api/telegram/route"

interface sendMessageProps {
  data: IFormDataMessage
  reset: UseFormReset<IFormDataMessage>
  messages: IMessage[]
  ticketId: string | null
  userId: string | undefined
  senderUsername: string | undefined
  avatarUrl: string | null
  router: AppRouterInstance
  setMessages: (messages: IMessage[]) => void
  setTicketId: (ticketId: string) => void
  bottomRef: RefObject<HTMLUListElement>
}

/**
 *
 * This function if (ticketId) - its
 */
export async function sendMessage({
  data, // data its from react-hook-form data.message
  reset,
  messages,
  ticketId,
  userId,
  senderUsername,
  avatarUrl,
  router,
  setMessages,
  setTicketId,
  bottomRef,
}: sendMessageProps): Promise<void> {
  // If message is empty of no ticketId - return
  if (data.message.length === 0) return

  const anonymousId = `anonymousId_${crypto.randomUUID()}`
  if (!userId) {
    // set anonymousId only when user send first message
    // so I reduce connections https://github.com/pusher/pusher-js/issues/807#event-11961892697
    setCookie("anonymousId", anonymousId)
    userId = anonymousId
  }
  if (!senderUsername) senderUsername = anonymousId

  reset()
  if (messages?.length === 0) {
    // all this code required to fix issue when I send 2 first messages in < 1 second
    const firstMessageId = crypto.randomUUID()
    const newTicketId = crypto.randomUUID() // generate ticketId for first message
    setTicketId(newTicketId)

    // dance arounding to insert current date-time
    const now = new Date()
    const timestampString = now.toISOString().replace("T", " ").replace("Z", "+00")

    const newMessage: IMessage = {
      id: firstMessageId, // needed to set in cuurent pusher channel (for key prop in react)
      created_at: timestampString,
      ticket_id: ticketId ?? newTicketId,
      sender_id: userId,
      sender_username: senderUsername,
      sender_avatar_url: avatarUrl,
      body: data.message,
      // TODO - add images logic in future
      images: null,
    }

    const newHandler = (message: IMessage) => {
      // Check if the message with the same id already exists
      const messageExists = messages.some(msg => msg.id === message.id)

      // Update the state based on whether the message exists or not
      setMessages(messageExists ? messages : [...messages, message])

      //Timeout is required here because without it scroll to bottom doesn't work
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollTop = bottomRef.current.scrollHeight
        }
      }, 10)
    }

    newHandler(newMessage)

    try {
      // 1. Insert row in table 'tickets'
      await axios.post("/api/tickets/open", {
        ticketId: newMessage.ticket_id,
        ownerId: userId,
        ownerUsername: senderUsername,
        messageBody: data.message,
        ownerAvatarUrl: avatarUrl,
      } as TAPITicketsOpen)
      // 2. Insert message in table 'messages'
      await axios.post("/api/message/send", {
        id: firstMessageId,
        ticketId: newMessage.ticket_id,
        senderId: userId,
        senderUsername: senderUsername,
        senderAvatarUrl: avatarUrl,
        messageBody: data.message,
        images: undefined,
        messageSender: "user",
      } as TAPIMessageSend)
      // 3. Send message in telegram
      await axios.post("/api/telegram", { message: telegramMessage } as TAPITelegram)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(113, "error sending message - ", error.response)
      }
    } finally {
      router.refresh()
    }
  } else {
    try {
      // 1. Insert message in table 'messages'
      await axios.post("/api/message/send", {
        ticketId: ticketId,
        senderId: userId,
        senderUsername: senderUsername,
        senderAvatarUrl: avatarUrl,
        messageBody: data.message,
        images: undefined,
        messageSender: "user",
      } as TAPIMessageSend)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(129, "error sending message - ", error.response)
      }
    }
    // 2. Scroll to bottom to show last messages
    if (bottomRef.current) {
      bottomRef.current?.scrollTo(0, bottomRef.current.scrollHeight)
      bottomRef.current.scrollIntoView()
    }
  }
}
