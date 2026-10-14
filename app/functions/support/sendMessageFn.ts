import moment from "moment-timezone"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { TMessageDB } from "@/ts/support/TMessageDB"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import { getDisplayUsername } from "@/utils/getDisplayUsername"
import { getUserId } from "@/utils/getUserId"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { useMessages } from "@/store/ui/useMessages"
import useToast from "@/store/ui/useToast"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

const ticketCreationInFlight = new Map<string, Promise<boolean>>()
const ticketNotificationPending = new Set<string>()

export async function sendMessageFn(t: TI18nFunction, messageBody: string, sender_id: string, imageUrl: string | null) {
  // Don't allow to send empty message (just with spaces and/or newlines)
  if (messageBody.trim().length === 0 && !imageUrl) return false

  const toast = useToast.getState()
  const { setMessages, ticketId: ticketIdState, setTicketId } = useMessages.getState()

  const ticketId = ticketIdState || getUserId()
  const senderUsername = getDisplayUsername(sender_id)

  const message: TMessageDB = {
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

  const currentMessages = useMessages.getState().messages
  setMessages([...currentMessages, message]) // optimistically set state

  const rateLimitSDK = new RateLimitSDK()
  let realtimeDelivered = true

  if (!ticketIdState) {
    let ticketCreation = ticketCreationInFlight.get(ticketId)
    if (!ticketCreation) {
      ticketCreation = (async () => {
        if (process.env.NODE_ENV === "production") await rateLimitSDK.rateLimit(t, "newTicket")

        const response = await supportSDK.openTicket({
          ticketId: message.ticket_id,
          ownerId: sender_id,
          ownerUsername: senderUsername,
          messageBody: messageBody || t("message.image_sent"),
          ownerAvatarUrl: null,
        })
        setTicketId(ticketId)
        ticketNotificationPending.add(ticketId)
        return response.realtimeDelivered !== false
      })()
      ticketCreationInFlight.set(ticketId, ticketCreation)
    }

    try {
      realtimeDelivered = await ticketCreation
    } catch (error) {
      console.error("Support ticket creation failed", error)
      const currentMessages = useMessages.getState().messages
      useMessages.getState().setMessages(currentMessages.filter(currentMessage => currentMessage.id !== message.id))
      toast.show("error", t("message.error.ticket_open_title"), t("message.error.ticket_open_body"))
      return false
    } finally {
      if (ticketCreationInFlight.get(ticketId) === ticketCreation) ticketCreationInFlight.delete(ticketId)
    }
  }

  try {
    if (process.env.NODE_ENV === "production") await rateLimitSDK.rateLimit(t, "newMessage")

    // 3. Insert message in table 'messages'
    const response = await supportSDK.sendMessage({
      id: message.id,
      ticketId: message.ticket_id,
      senderId: message.sender_id,
      senderUsername: senderUsername,
      senderAvatarUrl: null,
      messageBody: message.body,
      images: imageUrl ? [imageUrl] : undefined,
      messageSender: "user",
    })
    if (response.realtimeDelivered === false || response.ticketMetadataUpdated === false) {
      realtimeDelivered = false
    }
  } catch (error) {
    console.error("Support message delivery failed", error)
    const currentMessages = useMessages.getState().messages
    useMessages.getState().setMessages(currentMessages.filter(currentMessage => currentMessage.id !== message.id))
    toast.show("error", t("message.error.not_saved_title"), t("message.error.not_saved_body"))
    return false
  }

  // The chat write is authoritative. A Telegram notification failure must not make the user retry
  // and create a duplicate message after the database already accepted it.
  if (ticketNotificationPending.has(ticketId)) {
    ticketNotificationPending.delete(ticketId)
    try {
      await emailsSDK.sendTelegramMessage(messageBody || t("message.image_sent"))
    } catch (error) {
      console.error("Support message was saved but Telegram notification failed", error)
      realtimeDelivered = false
    }
  }

  if (!realtimeDelivered) {
    toast.show("warning", t("message.warning.notification_title"), t("message.warning.notification_body"))
  }

  return true
}
