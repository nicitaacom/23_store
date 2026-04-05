"use client"

import Image from "next/image"
import { useState } from "react"
import { BsCheck2 } from "react-icons/bs"
import { twMerge } from "tailwind-merge"

import useSender from "@/hooks/ui/useSender"
import { useScopedI18n } from "@/locales/client"
import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview"
import { IMessageDB } from "@/ts/support/IMessageDB"
import { formatTime } from "@/utils/formatTime"

interface MessageBoxProps {
  message: IMessageDB
  inverseColors?: boolean
}

export function MessageBox({ message, inverseColors }: MessageBoxProps) {
  const { isOwn, avatar_url } = useSender(message.sender_avatar_url || "", message.sender_id)
  const t = useScopedI18n("support")
  const { setImage } = useGlobalImagePreview()
  const [isOpeningImage, setIsOpeningImage] = useState(false)

  if (!message || !message.sender_id) {
    return null
  }

  const ownBubbleClass =
    "rounded-br border-violet-400/35 bg-violet-600 text-white shadow-compact"
  const foreignBubbleClass =
    "rounded-bl border-white/8 bg-[#21232b] text-slate-100 shadow-compact"
  const bubbleBaseClass = "w-fit max-w-full break-words rounded border px-3 py-2 text-[13px] leading-[1.5]"
  const metaTime = formatTime(message.created_at, !inverseColors)
  const incomingLabel = message.sender_username || "Support"

  async function handleOpenImage(imageUrl: string) {
    try {
      setIsOpeningImage(true)

      const response = await fetch(imageUrl)
      if (!response.ok) return

      const blob = await response.blob()
      const fileName = imageUrl.split("/").pop()?.split("?")[0] || "chat-image"
      const imageFile = new File([blob], fileName, { type: blob.type || "image/jpeg" })

      setImage(imageFile, isOwn ? "user" : "support", true)
    } finally {
      setIsOpeningImage(false)
    }
  }

  return (
    <li className={twMerge("flex w-full items-end gap-2", isOwn && "justify-end")}>
      {!isOwn && (
        <Image
          className="h-8 w-8 shrink-0 rounded border border-white/10 bg-[#23252d] object-cover shadow-compact"
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
            <Image
              className={twMerge("max-h-[220px] w-full object-cover transition-transform duration-300 hover:scale-[1.02]", isOpeningImage && "opacity-70")}
              src={message.images[0]}
              alt="Message attachment"
              width={240}
              height={240}
              sizes="240px"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 text-left">
              <p className="text-[11px] font-medium text-white">{isOpeningImage ? "Opening preview..." : "Open image"}</p>
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
            "flex items-center gap-1.5 px-1 text-[10px] text-slate-500",
            isOwn && "justify-end",
          )}>
          {!isOwn && <span className="font-medium text-slate-400">{incomingLabel}</span>}
          {!isOwn && <span className="h-1 w-1 rounded-full bg-slate-600" />}
          <span>{metaTime}</span>
          {isOwn && (
            <span className="relative ml-1 flex items-center pr-2 text-violet-300">
              <BsCheck2 size={14} />
              {message.seen && <BsCheck2 className="absolute left-[5px]" size={14} />}
            </span>
          )}
        </div>
      </article>
    </li>
  )
}
