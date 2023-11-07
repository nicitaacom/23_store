import { create } from "zustand"

interface AreYouSureClearCartModalStore {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useAreYouSureClearCartModal = create<AreYouSureClearCartModalStore>()(set => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}))
