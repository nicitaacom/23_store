"use client"

import { FaCheck } from "react-icons/fa"
import axios from "axios"

import { TAPITicketsClose } from "@/api/tickets/close/route"
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal"
import useTicket from "@/hooks/support/useTicket"
import { AreYouSureModalContainer } from "./ModalContainers"
import { useRouter } from "next/navigation"

export function AreYouSureMarkTicketAsCompletedSupportModal() {
  const router = useRouter()
  const areYouSureMarkTicketAsCompletedSupportModal = useAreYouSureMarkTicketAsCompletedSupportModal()

  const { ticketId } = useTicket()

  async function markTickedAsCompleted() {
    areYouSureMarkTicketAsCompletedSupportModal.closeModal()
    await axios.post("/api/tickets/close", { ticketId: ticketId, closedBy: "support" } as TAPITicketsClose)
    router.refresh()
  }

  return (
    <AreYouSureModalContainer
      className="pb-0"
      isOpen={areYouSureMarkTicketAsCompletedSupportModal.isOpen}
      label={<h2 className="mb-2">Are you sure you want mark this ticket as completed?</h2>}
      subTitle={
        <div className="flex flex-col">
          <p>This action close this ticket</p>
          <p>If you didn&apos;t help - closing this ticket may affect on your reputation</p>
        </div>
      }
      primaryButtonIcon={FaCheck}
      primaryButtonVariant="success"
      primaryButtonAction={markTickedAsCompleted}
      primaryButtonLabel="Yes"
      secondaryButtonAction={areYouSureMarkTicketAsCompletedSupportModal.closeModal}
      secondaryButtonVariant="danger-outline"
      secondaryButtonLabel="No"
    />
  )
}
