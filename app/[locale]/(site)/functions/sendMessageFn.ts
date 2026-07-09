import moment from "moment-timezone"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { IMessageDB } from "@/ts/support/IMessageDB"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import { getDisplayUsername } from "@/utils/getDisplayUsername"
import { getUserId } from "@/utils/getUserId"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

export async function sendMessageFn(t: TI18nFunction, messageBody: string, sender_id: string, imageUrl: string | null) {
  // Don't allow to send empty message (just with spaces and/or newlines)
  if (messageBody.trim().length === 0 && !imageUrl) return

  const { messages, setMessages, ticketId: ticketIdState, setTicketId } = useMessagesStore.getState()

  const isFirstMessage = messages.length === 0
  const ticketId = ticketIdState || getUserId()
  const senderUsername = getDisplayUsername(sender_id)

  const message: IMessageDB = {
    id: crypto.randomUUID(), // to don't wait response from DB about generated id
    created_at: moment().tz("Europe/Berlin").format(),
    seen: false,
    body: messageBody,
    images: imageUrl ? [imageUrl] : null,
    sender_id: sender_id,
    sender_avatar_url: null,
    sender_username: senderUsername,
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
      await emailsSDK.sendTelegramMessage(messageBody || t("message.image_sent"))

      // 2. Insert row in table 'tickets'
      await supportSDK.openTicket({
        ticketId: message.ticket_id,
        ownerId: sender_id,
        ownerUsername: senderUsername,
        messageBody: messageBody || t("message.image_sent"),
        ownerAvatarUrl: null,
      })
    } catch (error) {
      console.log(53, t("message.error.image_sent"), error)
      setMessages([])
      setTicketId("")
    }
  }

    try {
      if (process.env.NODE_ENV === "production") await rateLimitSDK.rateLimit(t, "newMessage")

      // 3. Insert message in table 'messages'
      await supportSDK.sendMessage({
        id: message.id,
        ticketId: message.ticket_id,
        senderId: message.sender_id,
        senderUsername: senderUsername,
        senderAvatarUrl: null,
        messageBody: message.body,
        images: imageUrl ? [imageUrl] : undefined,
        messageSender: "user",
      })
  } catch (error) {
    console.log(75, t("message.error.message_sent"), error)
    setMessages(messages.slice(0, -1)) // delete last message and keep other
  }
}
