import { create } from "zustand"

type AvatarDropdownStore = {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useAvatarDropdown = create<AvatarDropdownStore>()(set => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}))
