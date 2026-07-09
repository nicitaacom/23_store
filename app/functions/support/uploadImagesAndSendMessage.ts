import { Dispatch, RefObject, SetStateAction } from "react"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { uploadImageFn } from "../uploadImageFn"
import { sendMessageFn } from "@/[locale]/(site)/functions/sendMessageFn"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import useToast from "@/store/ui/useToast"

export async function uploadImagesAndSendMessage(
  t: TI18nFunction,
  setHeight: Dispatch<SetStateAction<number>>,
  messageBody: string,
  userId: string,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const toast = useToast.getState()
  const { setMessageBodyValue } = useMessagesStore.getState()
  setMessageBodyValue("") // Clear the textarea after sending the message
  let imageUrl: string | null = null
  const { image, setImage } = useMessagesStore.getState()

  if (image) {
    const imgUrl = await uploadImageFn({
      t,
      imageFile: image,
      bucket: "23_public-images",
    })
    if (imgUrl === undefined) return
    if (typeof imgUrl === "string") return toast.show("error", t("support.error.uploading_image"), imgUrl)

    imageUrl = imgUrl.publicUrl
  }
  await sendMessageFn(t, messageBody.trim(), userId, imageUrl)
  setImage(null)
  setHeight(38) // Reset height to initial value after message is sent

  // Ensure textarea is updated immediately
  if (textareaRef.current) {
    textareaRef.current.value = ""
    textareaRef.current.setSelectionRange(0, 0)
  }
}
