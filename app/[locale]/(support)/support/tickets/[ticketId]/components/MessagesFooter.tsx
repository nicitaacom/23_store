"use client"

import { useEffect } from "react"

import { getUserAvatarUrl, getUserName } from "@/utils/user"
import { supportSDK } from "@/sdk/SupportSDK/SupportSDK"
import { uploadImageFn } from "@/functions/uploadImageFn"
import { useI18n } from "@/locales/client"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { useSupportReplyDrafts } from "@/[locale]/(support)/store/useSupportReplyDrafts"
import useToast from "@/store/ui/useToast"
import useUserStore from "@/store/user/userStore"
import { MessageInput } from "@/components/ui/Inputs/MessageInput"

export function MessagesFooter({ ticket_id }: { ticket_id: string }) {
  const toast = useToast()
  const t = useI18n()
  const { user } = useUserStore()
  const { messageBodyValue, setMessageBodyValue, setImage } = useMessagesStore()
  const { setDraft, clearDraft } = useSupportReplyDrafts()

  // Seed this ticket's draft into the shared composer on mount / ticket change, and on unmount reset the
  // shared value so the chat window's composer (same useMessagesStore) never inherits a support draft.
  useEffect(() => {
    setMessageBodyValue(useSupportReplyDrafts.getState().draftsByTicketId[ticket_id] ?? "")
    return () => setMessageBodyValue("")
  }, [ticket_id, setMessageBodyValue])

  // Keep the per-ticket draft in sync as support types, so switching tickets preserves each unsent reply.
  useEffect(() => {
    if (messageBodyValue) setDraft(ticket_id, messageBodyValue)
    else clearDraft(ticket_id)
  }, [messageBodyValue, ticket_id, setDraft, clearDraft])

  async function handleSend(messageBody: string, image: File | null) {
    let images: string[] | undefined = undefined
    if (image) {
      const uploadImageResp = await uploadImageFn({ t, imageFile: image, bucket: "23_public-images" })
      if (typeof uploadImageResp === "string") return toast.show("error", t("support.error.uploading_image"), uploadImageResp)
      images = [uploadImageResp.publicUrl]
    }

    await supportSDK.sendMessage({
      messageBody,
      ticketId: ticket_id,
      senderId: user?.id || "",
      senderUsername: getUserName(user),
      senderAvatarUrl: getUserAvatarUrl(user),
      images,
      messageSender: "support",
    })
    setImage(null)
    clearDraft(ticket_id)
  }

  return <MessageInput onSend={handleSend} placeholder={t("support.reply_placeholder")} />
}
