"use client"

import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { BsCheck2 } from "react-icons/bs"

import { IMessageDB } from "@/TS/support/IMessage"
import { formatTime } from "@/utils/formatTime"
import useSender from "@/hooks/ui/useSender"

interface MessageBoxProps {
  message: IMessageDB
  inverseColors?: boolean
}

export function MessageBox({ message, inverseColors }: MessageBoxProps) {
  const { isOwn, avatar_url } = useSender(message.sender_avatar_url || "", message.sender_id)

  if (!message || !message.sender_id) {
    return null
  }

  // TODO - show gray-bg for !isOwn messages
  const messageIsOwn = twMerge(
    isOwn
      ? `rounded-br-[4px] before:rounded-tl-[4px]
      bg-foreground-accent before:bg-foreground-accent`
      : `rounded-bl-[4px] before:left-[6px] before:border-l-0 before:border-r-2
       before:rounded-tr-[4px] before:rounded-br-sm before:rounded-tl-sm
      before:rotate-[145deg] before:bottom-[-6px]
      bg-foreground before:bg-foreground`,
    inverseColors && isOwn && "bg-foreground before:bg-foreground",
    inverseColors && !isOwn && "bg-foreground-accent before:bg-foreground-accent",
  )

  return (
    <div className={twMerge(`w-full flex gap-x-2`, isOwn && "justify-end")}>
      <Image
        className={`w-[36px] h-[36px] mt-1 rounded-full select-none pointer-events-none flex-shrink-0 ${
          isOwn ? "order-last" : "order-first"
        }`}
        src={avatar_url}
        alt="user-image"
        width={36}
        height={36}
      />
      <article className={twMerge("relative max-w-[70%] flex flex-col gap-1.5", isOwn ? "items-end" : "items-start")}>
        <p className={twMerge("text-[10px] text-subTitle px-1", isOwn ? "text-end" : "text-start")}>
          {formatTime(message.created_at)}
        </p>

        {message.images && message.images.length === 1 && (
          <div
            className={twMerge("relative w-full max-w-[220px] rounded-lg overflow-hidden border border-border-color")}>
            <Image
              src={message.images[0]}
              alt="message-image"
              width={220}
              height={220}
              className="w-full h-auto object-cover max-h-[180px]"
            />
          </div>
        )}

        {message.images && message.images.length > 1 && (
          <div className="text-xs text-subTitle px-3 py-1.5 bg-foreground-accent rounded-lg border border-border-color">
            📎 {message.images.length} images attached
          </div>
        )}
        {message.body && (
          <div
            className={twMerge(
              `relative w-fit max-w-full break-words rounded-lg text-[13px] text-title px-3 py-2
       before:content-[''] before:absolute before:w-0 before:h-0 before:bottom-0
       before:border-[6px] before:border-solid`,
              isOwn
                ? "bg-success/15 border border-success/30 pr-8 before:right-[-11px] before:border-t-success/30 before:border-l-success/30 before:border-r-transparent before:border-b-transparent"
                : "bg-foreground-accent border border-border-color before:left-[-11px] before:border-t-border-color before:border-r-border-color before:border-l-transparent before:border-b-transparent",
            )}>
            {message.body}
          </div>
        )}

        {isOwn && (
          <>
            <BsCheck2 className="absolute bottom-[2px] right-2.5 text-success-accent" size={18} />
            {message.seen && <BsCheck2 className="absolute bottom-[2px] right-1.5 text-success-accent" size={18} />}
          </>
        )}
      </article>
    </div>
  )
}
