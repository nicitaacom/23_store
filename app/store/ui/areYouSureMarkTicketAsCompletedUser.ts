import { create } from "zustand"

type AreYouSureMarkTicketAsCompletedUserStore = {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useAreYouSureMarkTicketAsCompletedUser = create<AreYouSureMarkTicketAsCompletedUserStore>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
