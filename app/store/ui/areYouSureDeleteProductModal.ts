import { create } from "zustand"

interface AreYouSureDeleteProductModalStore {
  id: string
  title: string
  isOpen: boolean
  openModal: (id: string, title: string) => void
  closeModal: () => void
}

export const useAreYouSureDeleteProductModal = create<AreYouSureDeleteProductModalStore>()(set => ({
  id: "",
  title: "",
  isOpen: false,
  openModal: (id: string, title: string) => set({ id: id, title: title, isOpen: true }),
  closeModal: () => set({ id: undefined, title: undefined, isOpen: false }),
}))
