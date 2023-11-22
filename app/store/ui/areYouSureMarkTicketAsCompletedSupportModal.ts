import { create } from "zustand"

type AreYouSureMarkTicketAsCompletedSupportModalStore = {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useAreYouSureMarkTicketAsCompletedSupportModal = create<AreYouSureMarkTicketAsCompletedSupportModalStore>(
  set => ({
    isOpen: false,
    openModal: () => set({ isOpen: true }),
    closeModal: () => set({ isOpen: false }),
  }),
)
