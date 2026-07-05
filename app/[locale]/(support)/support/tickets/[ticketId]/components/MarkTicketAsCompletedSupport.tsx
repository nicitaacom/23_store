"use client"

import { FiCheckCircle } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { Button } from "@/components/ui"
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal"

export function MarkTicketAsCompletedSupport({ className }: { className?: string }) {
  const areYouSureMarkTicketAsCompletedSupportModal = useAreYouSureMarkTicketAsCompletedSupportModal()

  return (
    <Button
      className={twMerge("border-success/25 bg-success/10 px-3 text-success hover:bg-success/15", className)}
      leftIcon={<FiCheckCircle size={15} />}
      variant="success-outline"
      size="sm"
      rounded="md"
      onClick={areYouSureMarkTicketAsCompletedSupportModal.openModal}
      type="button">
      Close
    </Button>
  )
}
