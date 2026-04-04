import moment from "moment-timezone"

import { IMessageDB } from "@/ts/support/IMessageDB"
import { TAPITicketsOpen } from "@/api/tickets/open/route"
import { TAPIMessageSend } from "@/api/message/send/route"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { getUserId } from "@/utils/getUserId"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

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
    images: imageUrl ? [imageUrl] : null,
    sender_id: sender_id,
    sender_avatar_url: null,
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
      const telegramResponse = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageBody || t("message.image_sent") } as API.TelegramRequest),
      })

      if (!telegramResponse.ok) {
        throw new Error(await getResponseErrorMessage(telegramResponse))
      }

      // 2. Insert row in table 'tickets'
      const ticketResponse = await fetch("/api/tickets/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: message.ticket_id,
          ownerId: sender_id,
          ownerUsername: sender_id,
          messageBody: messageBody || t("message.image_sent"),
          ownerAvatarUrl: null,
        } as TAPITicketsOpen),
      })

      if (!ticketResponse.ok) {
        throw new Error(await getResponseErrorMessage(ticketResponse))
      }
    } catch (error) {
      console.log(53, t("message.error.image_sent"), error)
      setMessages([])
      setTicketId("")
    }
  }

  try {
    if (process.env.NODE_ENV === "production") await rateLimitSDK.rateLimit(t, "newMessage")

    // 3. Insert message in table 'messages'
    const response = await fetch("/api/message/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: message.id,
        ticketId: message.ticket_id,
        senderId: message.sender_id,
        senderUsername: message.sender_id,
        senderAvatarUrl: null,
        messageBody: message.body,
        images: imageUrl ? [imageUrl] : undefined,
        messageSender: "user",
      } as TAPIMessageSend),
    })

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response))
    }
  } catch (error) {
    console.log(75, t("message.error.message_sent"), error)
    setMessages(messages.slice(0, -1)) // delete last message and keep other
  }
}
