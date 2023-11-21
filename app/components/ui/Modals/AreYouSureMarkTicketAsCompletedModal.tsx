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
      label={<h2 className="mb-2">Are you sure you want mark this ticket as completed?</h2>}
      subTitle={
        <div className="flex flex-col">
          <p>This action close this ticket</p>
          <p>If you didn&apos;t help - closing this ticket may affect on your reputation</p>
        </div>
      }
      primaryButtonIcon={FaCheck}
      primaryButtonVariant="success"
      primaryButtonAction={IoIosClose}
      primaryButtonLabel="Yes"
      secondaryButtonAction={areYouSureMarkTicketAsCompletedModal.closeModal}
      secondaryButtonVariant="danger-outline"
      secondaryButtonLabel="No"
    />
  )
}
