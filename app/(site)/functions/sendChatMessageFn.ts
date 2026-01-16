import axios, { AxiosError } from "axios"
import moment from "moment-timezone"

import { IMessageDB } from "@/TS/support/IMessage"
import { TAPITelegram } from "@/api/telegram/route"
import { TAPITicketsOpen } from "@/api/tickets/open/route"
import { TAPIMessageSend } from "@/api/message/send/route"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { getUserId } from "@/utils/getUserId"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

export async function sendMessageFn(messageBody: string, sender_id: string, imageUrl: string | null) {
  // Don't allow to send empty message (just with spaces and/or newlines)
  if (messageBody.trim().length === 0 && !imageUrl) return

  const { messages, setMessages, ticketId: ticketIdState, setTicketId } = useMessagesStore.getState()

  const isFirstMessage = messages.length === 0
  const ticketId = ticketIdState || getUserId()

  const message: IMessageDB = {
    id: crypto.randomUUID(), // to don't wait response from DB about generated id
    created_at: moment().tz("Europe/Berlin").format(),
    seen: false,
    body: messageBody,
    sender_id: sender_id,
    sender_username: sender_id,
    ticket_id: ticketId,
  }

  setMessages([...messages, message]) // optimistically set state

  const rateLimitSDK = new RateLimitSDK()

  if (isFirstMessage) {
    await rateLimitSDK.rateLimit("newTicket")

    setTicketId(ticketId)
    console.log(39, "messages - ", messages)
    try {
      // 1. Send message in telegram
      await axios.post("/api/telegram", { message: message.body } as TAPITelegram)
      // 2. Insert row in table 'tickets'
      await axios.post("/api/tickets/open", {
        ticketId: message.ticket_id,
        ownerId: sender_id,
        ownerUsername: sender_id,
        messageBody: message.body,
        ownerAvatarUrl: null, // TODO - getAvatarUrl() - set avatar here based on isAuthenticated
      } as TAPITicketsOpen)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(113, "error sending message - ", error.response)
        setMessages([]) // in case error delete message
        setTicketId("")
      }
    }
  }

  try {
    await rateLimitSDK.rateLimit("newMessage")
    // 3. Insert message in table 'messages'
    await axios.post("/api/message/send", {
      id: message.id,
      ticketId: message.ticket_id,
      senderId: message.sender_id,
      senderUsername: message.sender_id,
      senderAvatarUrl: null, // TODO getAvatarUrl()
      messageBody: message.body,
      images: undefined,
      messageSender: "user",
    } as TAPIMessageSend)
  } catch (error) {
    console.log(74, "error inserting new message", error)
    setMessages(messages.slice(0, -1)) // delete last message and keep other
  }
}
