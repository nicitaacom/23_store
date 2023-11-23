"use client"

import { useEffect } from "react"
import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { BsCheck2 } from "react-icons/bs"

import { IMessage } from "@/interfaces/IMessage"
import { formatTime } from "@/utils/formatTime"
import useSender from "@/hooks/ui/useSender"

interface MessageBoxProps {
  message: IMessage
}

export function MessageBox({ message }: MessageBoxProps) {
  const { isOwn, avatar_url } = useSender(message.sender_avatar_url || "", message.sender_id)

  if (!message || !message.sender_id) {
    return null
  }

  // TODO - show gray-bg for !isOwn messages
  const messageIsOwn = twMerge(
    isOwn
      ? "bg-info"
      : `before:left-[5px] before:border-l-0 before:border-r-2 before:rounded-r-none before:rounded-b-full
      before:rotate-[145deg] before:bottom-[-6px] 
      bg-foreground before:bg-foreground text-title`,
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
            `relative w-fit max-w-full break-normal border-2 text-start text-title-foreground pl-2 pr-3 pt-0.5 pb-1 bg-info rounded-lg
         before:w-3 before:h-3 before:bg-info before:border-l-2 before:border-t-2 before:border-solid before:border-border-color
       before:rotate-[195deg] before:rounded-r-full before:absolute before:bottom-[-4px] before:right-[-6px] before:translate-x-[-50%]`,
            messageIsOwn,
          )}>
          {message.body}
        </p>
        {isOwn && (
          <>
            <BsCheck2 className="absolute bottom-[2px] right-2.5 text-success-accent" />
            {message.seen && <BsCheck2 className="absolute bottom-[2px] right-1.5 text-success-accent" />}
          </>
        )}
      </article>
    </div>
  )
}
