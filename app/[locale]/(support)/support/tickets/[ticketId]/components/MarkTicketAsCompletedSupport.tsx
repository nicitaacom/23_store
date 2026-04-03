"use client"

import { FiCheckCircle } from "react-icons/fi"

import { Button } from "@/components/ui"
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal"

export function MarkTicketAsCompletedSupport() {
  const areYouSureMarkTicketAsCompletedSupportModal = useAreYouSureMarkTicketAsCompletedSupportModal()

  return (
    <Button
      className="rounded-full border-success/25 bg-success/10 px-3 text-success hover:bg-success/15"
      leftIcon={<FiCheckCircle size={15} />}
      variant="success-outline"
      size="sm"
      rounded="full"
      onClick={areYouSureMarkTicketAsCompletedSupportModal.openModal}
      type="button">
      Close
    </Button>
  )
}
