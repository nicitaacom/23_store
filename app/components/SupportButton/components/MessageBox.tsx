"use client"

import { IMessage } from "@/interfaces/IMessage"
import useDarkMode from "@/store/ui/darkModeStore"
import useUserStore from "@/store/user/userStore"
import { formatTime } from "@/utils/formatTime"
import { getCookie } from "@/utils/helpersCSR"
import Image from "next/image"
import { useEffect } from "react"
import { twMerge } from "tailwind-merge"

interface MessageBoxProps {
  message: IMessage
}

export function MessageBox({ message }: MessageBoxProps) {
  const userStore = useUserStore()
  const { isDarkMode } = useDarkMode()

  useEffect(() => {
    //axios.post('/api/messages/seen')
  }, [])
  if (!message || !message.sender_id) {
    // Handle the case when message or sender_id is not defined
    // For example, you can return a placeholder or an error message
    return <div>Error: Message or sender_id is not defined</div>
  }

  console.log(19, "message - ", message.sender_id)

  const userId = userStore.userId === "" ? getCookie("anonymousId") : userStore.userId
  const isOwn = userId === message.sender_id

  // TODO - show gray-bg for !isOwn messages
  const messageIsOwn = twMerge(isOwn ? "bg-info text-title" : "bg-foreground")

  return (
    <div className={twMerge(`flex gap-x-2`, isOwn && "justify-end")}>
      <Image
        className={`w-[42px] h-[42px] mt-1 rounded-full select-none pointer-events-none ${
          isOwn ? "order-first" : "order-last"
        }`}
        src={
          userStore.isAuthenticated
            ? userStore.avatarUrl
              ? userStore.avatarUrl
              : "/placeholder.jpg"
            : isDarkMode
              ? "/BiUserCircle-dark.svg"
              : "/BiUserCircle-light.svg"
        }
        alt="user-image"
        width={46}
        height={46}
      />
      <div className="relative flex flex-col items-end px-1 py-0.5">
        <p className="text-xs">{formatTime(message.created_at)}</p>
        <p
          className="relative w-fit  border-2 text-start text-title-foreground pl-2 pr-3 pt-0.5 pb-1 bg-info rounded-lg
         before:w-3 before:h-3 before:bg-info before:border-l-2 before:border-t-2 before:border-solid before:border-border-color
       before:rotate-[195deg] before:rounded-r-full before:absolute before:bottom-[-4px] before:right-[-6px] before:translate-x-[-50%]">
          {message.body}
        </p>
        {/* TODO - seen in the future */}
        {/* <BsCheck2 className="absolute bottom-[2px] right-2 " /> */}
      </div>
    </div>
  )
}
