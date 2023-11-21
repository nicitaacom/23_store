"use client"

import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import { useAreYouSureMarkTicketAsCompletedModal } from "@/store/ui/areYouSureMarkTicketAsCompletedModal"

export function MarkTicketAsCompleted() {
  const { isDarkMode } = useDarkMode()
  const areYouSureMarkTicketAsCompleteModal = useAreYouSureMarkTicketAsCompletedModal()

  return (
    <div className="p-2 hover:bg-success/10 duration-150 rounded-md w-fit cursor-pointer" role="button">
      <Image
        src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
        alt="close ticket"
        width={32}
        height={32}
        onClick={areYouSureMarkTicketAsCompleteModal.openModal}
      />
    </div>
  )
}
