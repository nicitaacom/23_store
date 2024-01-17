"use client"

import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { BsCheck2 } from "react-icons/bs"

import { IMessage } from "@/interfaces/support/IMessage"
import { formatTime } from "@/utils/formatTime"
import useSender from "@/hooks/ui/useSender"

interface MessageBoxProps {
  message: IMessage
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
        className={`w-[42px] h-[42px] mt-1 rounded-full select-none pointer-events-none ${
          isOwn ? "order-last" : "order-first"
        }`}
        src={avatar_url}
        alt="user-image"
        width={46}
        height={46}
      />
      <article
        className={twMerge("relative max-w-[50%] flex flex-col px-1 py-0.5", isOwn ? "items-end" : "items-start")}>
        <p className={twMerge("w-full text-xs", isOwn ? "text-end" : "text-start")}>{formatTime(message.created_at)}</p>
        <p
          className={twMerge(
            `relative w-fit max-w-full break-normal border-2 rounded-lg text-start text-title pl-2 pr-3 pt-0.5 pb-1
         before:w-3 before:h-3 before:border-l-2 before:border-t-2 before:border-solid before:border-border-color
       before:rotate-[215deg] before:absolute before:bottom-[-6px] before:right-[-6px] before:translate-x-[-50%]`,
            messageIsOwn,
          )}>
          {message.body}
        </p>
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
