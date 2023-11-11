import { create } from "zustand"

type ContactDropdownStore = {
  isDropdown: boolean
  openDropdown: () => void
  closeDropdown: () => void
  toggle: () => void
}

export const useContactDropdown = create<ContactDropdownStore>()((set, get) => ({
  isDropdown: false,
  openDropdown: () => set({ isDropdown: true }),
  closeDropdown: () => set({ isDropdown: false }),
  toggle: () => set({ isDropdown: !get().isDropdown }),
}))
