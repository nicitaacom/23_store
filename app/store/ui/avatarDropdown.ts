import { create } from "zustand"

type AvatarDropdownStore = {
  isDropdown: boolean
  openDropdown: () => void
  closeDropdown: () => void
  toggle: () => void
}

export const useAvatarDropdown = create<AvatarDropdownStore>()((set, get) => ({
  isDropdown: false,
  openDropdown: () => set({ isDropdown: true }),
  closeDropdown: () => set({ isDropdown: false }),
  toggle: () => set({ isDropdown: !get().isDropdown }),
}))
