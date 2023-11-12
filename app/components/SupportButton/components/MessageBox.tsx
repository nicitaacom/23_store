"use client"

import { IMessage } from "@/interfaces/IMessage"
import supabaseClient from "@/libs/supabaseClient"
import useDarkMode from "@/store/ui/darkModeStore"
import useUserStore from "@/store/user/userStore"
import { getCookie } from "@/utils/helpersCSR"
import Image from "next/image"
import { BiUserCircle } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

interface MessageBoxProps {
  isLast: boolean
  data: IMessage
}

export function MessageBox({ isLast, data }: MessageBoxProps) {
  const userStore = useUserStore()
  const { isDarkMode } = useDarkMode()

  const userId = userStore.userId === "" ? getCookie("anonymousId") : userStore.userId
  const isOwn = userId === data.sender_id

  const message = twMerge(isOwn ? "bg-info text-title" : "bg-foreground")

  return (
    <div className={twMerge(`flex`, isOwn && "justify-end")}>
      <Image
        className="rounded-full select-none pointer-events-none"
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
        width={42}
        height={42}
      />
    </div>
  )
}
