import { FaCheck } from "react-icons/fa"
import { IoIosClose } from "react-icons/io"

import { useAreYouSureMarkTicketAsCompletedModal } from "@/store/ui/areYouSureMarkTicketAsCompletedModal"
import { AreYouSureModalContainer } from "./ModalContainers"

export function AreYouSureMarkTicketAsCompletedModal() {
  const areYouSureMarkTicketAsCompletedModal = useAreYouSureMarkTicketAsCompletedModal()

  return (
    <AreYouSureModalContainer
      isOpen={areYouSureMarkTicketAsCompletedModal.isOpen}
      isLoading={false}
      label={<h2>Are you sure you want mark this ticket as completed?</h2>}
      primaryButtonIcon={FaCheck}
      primaryButtonVariant="danger"
      primaryButtonAction={IoIosClose}
      primaryButtonLabel="Delete"
      secondaryButtonAction={areYouSureMarkTicketAsCompletedModal.closeModal}
      secondaryButtonLabel="Back"
    />
  )
}
