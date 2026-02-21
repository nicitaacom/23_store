import axios, { AxiosError } from "axios"
import moment from "moment-timezone"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { TAPITicketsOpen } from "@/api/tickets/open/route"
import { TAPIMessageSend } from "@/api/message/send/route"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { getUserId } from "@/utils/getUserId"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export async function sendMessageFn(t: TI18nFunction, messageBody: string, sender_id: string, imageUrl: string | null) {
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
    try {
      if (process.env.NODE_ENV === "production") await rateLimitSDK.rateLimit(t, "newTicket")

      setTicketId(ticketId)
      console.log(39, "messages - ", messages)

      // 1. Send message in telegram
      await axios.post("/api/telegram", { message: messageBody || t("message.image_sent") } as API.TelegramRequest)
      // 2. Insert row in table 'tickets'
      await axios.post("/api/tickets/open", {
        ticketId: message.ticket_id,
        ownerId: sender_id,
        ownerUsername: sender_id,
        messageBody: messageBody || t("message.image_sent"),
        ownerAvatarUrl: null, // TODO - getAvatarUrl() - set avatar here based on isAuthenticated
      } as TAPITicketsOpen)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(53, t("message.error.image_sent"), error.response)
        setMessages([]) // in case error delete message
        setTicketId("")
      }
    }
  }

  try {
    if (process.env.NODE_ENV === "production") await rateLimitSDK.rateLimit(t, "newMessage")

    // 3. Insert message in table 'messages'
    await axios.post("/api/message/send", {
      id: message.id,
      ticketId: message.ticket_id,
      senderId: message.sender_id,
      senderUsername: message.sender_id,
      senderAvatarUrl: null, // TODO getAvatarUrl()
      messageBody: message.body,
      images: [imageUrl],
      messageSender: "user",
    } as TAPIMessageSend)
  } catch (error) {
    console.log(75, t("message.error.message_sent"), error)
    setMessages(messages.slice(0, -1)) // delete last message and keep other
  }
}
