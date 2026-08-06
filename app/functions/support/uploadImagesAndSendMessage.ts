import { Dispatch, RefObject, SetStateAction } from "react"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getSupportImageBucketAndFolder } from "../uploadImageFolder"
import { getTimestampFileName } from "./image/getTimestampFileName"
import { sendMessageFn } from "./sendMessageFn"
import { uploadImageFn } from "../uploadImageFn"
import { useMessages } from "@/store/ui/useMessages"
import useToast from "@/store/ui/useToast"

export async function uploadImagesAndSendMessage(
  t: TI18nFunction,
  setHeight: Dispatch<SetStateAction<number>>,
  messageBody: string,
  userId: string,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const toast = useToast.getState()
  const { setMessageBodyValue } = useMessages.getState()
  setMessageBodyValue("") // Clear the textarea after sending the message
  let imageUrl: string | null = null
  const { image, setImage } = useMessages.getState()

  if (image) {
    const response = await uploadImageFn({
      t,
      imageFile: image,
      ...getSupportImageBucketAndFolder(),
      fileName: getTimestampFileName(image),
    })
    if (response === undefined) return
    if (typeof response === "string") return toast.show("error", t("support.error.uploading_image"), response)

    imageUrl = response.publicUrl
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
