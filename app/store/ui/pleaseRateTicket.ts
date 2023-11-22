import { create } from "zustand"

type PleaseRateTicketStore = {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const usePleaseRateTicket = create<PleaseRateTicketStore>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
