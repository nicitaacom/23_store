import { Dispatch, RefObject, SetStateAction } from "react"

import { uploadImageFn } from "./image/uploadImageFn"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { sendMessageFn } from "@/(site)/functions/sendMessageFn"
import useToast from "@/store/ui/useToast"

export async function uploadImagesAndSendMessage(
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
      imageFile: image,
      bucket: "public-images",
    })
    if (imgUrl === undefined) return
    if (typeof imgUrl === "string") return toast.show("error", "Error uploading image", imgUrl)

    imageUrl = imgUrl.publicUrl
  }
  await sendMessageFn(messageBody.trim(), userId, imageUrl)
  setImage(null)
  setHeight(38) // Reset height to initial value after message is sent

  // Ensure textarea is updated immediately
  if (textareaRef.current) {
    textareaRef.current.value = ""
    textareaRef.current.setSelectionRange(0, 0)
  }
}
