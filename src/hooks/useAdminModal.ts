import { create } from "zustand"

interface AdminModalStore {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
}

const useAdminModal = create<AdminModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}))

export default useAdminModal