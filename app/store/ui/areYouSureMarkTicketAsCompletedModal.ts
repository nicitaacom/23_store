import { create } from "zustand"

type AreYouSureMarkTicketAsCompletedModalStore = {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useAreYouSureMarkTicketAsCompletedModal = create<AreYouSureMarkTicketAsCompletedModalStore>(set => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}))
