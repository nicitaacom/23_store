"use client"

import Image from "next/image"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal"

export function MarkTicketAsCompletedSupport() {
  const { isDarkMode } = useDarkModeStore()
  const areYouSureMarkTicketAsCompletedSupportModal = useAreYouSureMarkTicketAsCompletedSupportModal()

  return (
    <div
      className="p-2 hover:bg-success/10 duration-150 rounded-md w-fit cursor-pointer"
      role="button"
      onClick={areYouSureMarkTicketAsCompletedSupportModal.openModal}>
      <Image
        src={isDarkMode ? "/mark-ticket-as-completed-dark.png" : "/mark-ticket-as-completed-light.png"}
        alt="close ticket"
        width={32}
        height={32}
      />
    </div>
  )
}
