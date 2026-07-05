"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BsCheck2 } from "react-icons/bs"
import { twMerge } from "tailwind-merge"

import useSender from "@/hooks/ui/useSender"
import useToast from "@/store/ui/useToast"
import { ImageWithFallback } from "@/components/ui/ImageWithFallback"
import { useScopedI18n } from "@/locales/client"
import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview"
import { IMessageDB } from "@/ts/support/IMessageDB"
import { formatTime } from "@/utils/formatTime"

interface MessageBoxProps {
  message: IMessageDB
  /** Show the timezone suffix in the meta time (thread view); off in the compact chat window. */
  showTimezone?: boolean
  animateEntry?: boolean
}

export function MessageBox({ message, showTimezone, animateEntry }: MessageBoxProps) {
  const toast = useToast()
  const { isOwn, avatar_url } = useSender(message.sender_avatar_url || "", message.sender_id)
  const t = useScopedI18n("support")
  const { setImage } = useGlobalImagePreview()
  const [isOpeningImage, setIsOpeningImage] = useState(false)
  const [isImageBroken, setIsImageBroken] = useState(false)

  if (!message || !message.sender_id) {
    return null
  }

  const ownBubbleClass = "rounded-br border-success-accent/30 bg-success-accent/12 text-title shadow-compact"
  const foreignBubbleClass = "rounded-bl border-border-color/30 bg-background/70 text-title shadow-compact"
  const bubbleBaseClass = "w-fit max-w-full break-words rounded border px-3 py-2 text-[13px] leading-[1.5]"
  const metaTime = formatTime(message.created_at, !showTimezone)
  const incomingLabel = message.sender_username || "Support"

  async function handleOpenImage(imageUrl: string) {
    // The image can be deleted from storage after the message was sent — fetch then 404s or fails outright.
    if (isImageBroken) return toast.show("warning", t("image_no_longer_available"))
    try {
      setIsOpeningImage(true)

      const response = await fetch(imageUrl)
      if (!response.ok) {
        setIsImageBroken(true)
        return toast.show("warning", t("image_no_longer_available"))
      }

      const imageBlob = await response.blob()
      const fileName = imageUrl.split("/").pop()?.split("?")[0] || "chat-image"
      const imageFile = new File([imageBlob], fileName, { type: imageBlob.type || "image/jpeg" })

      setImage(imageFile, isOwn ? "user" : "support", true)
    } catch {
      setIsImageBroken(true)
      toast.show("warning", t("image_no_longer_available"))
    } finally {
      setIsOpeningImage(false)
    }
  }

  return (
    <motion.li
      className={twMerge("flex w-full items-end gap-2", isOwn && "justify-end")}
      initial={animateEntry ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}>
      {!isOwn && (
        <ImageWithFallback
          className="h-8 w-8 shrink-0 rounded border border-border-color/30 bg-background/70 object-cover shadow-compact"
          src={avatar_url}
          alt="Sender avatar"
          width={32}
          height={32}
          sizes="32px"
        />
      )}

      <article className={twMerge("flex max-w-[min(82%,440px)] flex-col gap-1", isOwn && "items-end")}>

        {message.images && message.images.length === 1 && (
          <button
            className={twMerge("relative w-full max-w-[240px] overflow-hidden rounded border", isOwn ? ownBubbleClass : foreignBubbleClass)}
            onClick={() => handleOpenImage(message.images![0])}
            type="button">
            <ImageWithFallback
              className={twMerge("max-h-[220px] w-full object-cover transition-transform duration-300 hover:scale-[1.02]", isOpeningImage && "opacity-70")}
              src={message.images[0]}
              alt="Message attachment"
              width={240}
              height={240}
              sizes="240px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 text-left">
              <p className="text-[11px] font-medium text-white">
                {isImageBroken ? t("image_no_longer_available") : isOpeningImage ? "Opening preview..." : "Open image"}
              </p>
            </div>
          </button>
        )}

        {message.images && message.images.length > 1 && (
          <div className={twMerge("w-fit rounded border px-2 py-1 text-xs", isOwn ? ownBubbleClass : foreignBubbleClass)}>
            {t("images_attached", { number: message.images.length })}
          </div>
        )}

        {message.body && (
          <div
            className={twMerge(
              bubbleBaseClass,
              "whitespace-pre-wrap",
              isOwn ? ownBubbleClass : foreignBubbleClass,
            )}>
            {message.body}
          </div>
        )}

        <div
          className={twMerge(
            "flex items-center gap-1.5 px-1 text-[10px] text-subTitle",
            isOwn && "justify-end",
          )}>
          {!isOwn && <span className="font-medium text-subTitle">{incomingLabel}</span>}
          {!isOwn && <span className="h-1 w-1 rounded-full bg-subTitle/40" />}
          <span>{metaTime}</span>
          {isOwn && (
            <span className="relative ml-1 flex items-center pr-2 text-success-accent">
              <BsCheck2 size={14} />
              {message.seen && <BsCheck2 className="absolute left-[5px]" size={14} />}
            </span>
          )}
        </div>
      </article>
    </motion.li>
  )
}
