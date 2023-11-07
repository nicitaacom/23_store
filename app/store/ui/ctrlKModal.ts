import { create } from "zustand"

type CtrlKModalStore = {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
  toggle: () => void
}

export const useCtrlKModal = create<CtrlKModalStore>((set, get) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}))
