"use client"

import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"

export function CloseTicket() {
  const { isDarkMode } = useDarkMode()

  return (
    <Image
      src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
      alt="close ticket"
      width={32}
      height={32}
      onClick={() => {
        /* TODO - OPEN ARE YOU SURE MODAL */
      }}
    />
  )
}
