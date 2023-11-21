import supabaseClient from "@/libs/supabaseClient"
import { FaCheck } from "react-icons/fa"

import { useAreYouSureMarkTicketAsCompletedModal } from "@/store/ui/areYouSureMarkTicketAsCompletedModal"
import useTicket from "@/hooks/support/useTicket"
import { AreYouSureModalContainer } from "./ModalContainers"
import { useRouter } from "next/navigation"

export function AreYouSureMarkTicketAsCompletedModal() {
  const router = useRouter()
  const areYouSureMarkTicketAsCompletedModal = useAreYouSureMarkTicketAsCompletedModal()

  const { ticketId } = useTicket()

  async function markTickedAsCompleted() {
    await supabaseClient.from("tickets").update({ is_open: false }).eq("id", ticketId)
    areYouSureMarkTicketAsCompletedModal.closeModal()
    router.push("/support/tickets")
  }

  return (
    <AreYouSureModalContainer
      isOpen={areYouSureMarkTicketAsCompletedModal.isOpen}
      isLoading={false}
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
      secondaryButtonAction={areYouSureMarkTicketAsCompletedModal.closeModal}
      secondaryButtonVariant="danger-outline"
      secondaryButtonLabel="No"
    />
  )
}
