"use client"

import { FaCheck } from "react-icons/fa"
import axios from "axios"

import { TAPITicketsClose } from "@/api/tickets/close/route"
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal"
import useTicket from "@/hooks/support/useTicket"
import { AreYouSureModalContainer } from "./ModalContainers"
import { useRouter } from "next/navigation"
import { useScopedI18n } from "@/locales/client"

export function AreYouSureMarkTicketAsCompletedSupportModal() {
  const t = useScopedI18n("modal")
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
      label={<h2 className="mb-2">{t("are_you_sure_mark_ticket_as_completed_support.label")}</h2>}
      subTitle={
        <div className="flex flex-col">
          <p>{t("are_you_sure_mark_ticket_as_completed_support.subtitle_l1")}</p>
          <p>{t("are_you_sure_mark_ticket_as_completed_support.subtitle_l2")}</p>
        </div>
      }
      primaryButtonIcon={FaCheck}
      primaryButtonVariant="success"
      primaryButtonAction={markTickedAsCompleted}
      primaryButtonLabel={t("yes")}
      secondaryButtonAction={areYouSureMarkTicketAsCompletedSupportModal.closeModal}
      secondaryButtonVariant="danger-outline"
      secondaryButtonLabel={t("no")}
    />
  )
}
