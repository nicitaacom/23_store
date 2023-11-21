"use client"

import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import { useAreYouSureMarkTicketAsCompletedModal } from "@/store/ui/areYouSureMarkTicketAsCompletedModal"

export function MarkTicketAsCompleted() {
  const { isDarkMode } = useDarkMode()
  const areYouSureMarkTicketAsCompleteModal = useAreYouSureMarkTicketAsCompletedModal()

  return (
    <Image
      src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
      alt="close ticket"
      width={32}
      height={32}
      onClick={areYouSureMarkTicketAsCompleteModal.openModal}
    />
  )
}
