import { getCookie, setCookie } from "@/utils/helpersCSR"
import { create } from "zustand"

type SupportDropdownStore = {
  isDropdown: boolean
  openDropdown: () => void
  closeDropdown: () => void
  toggle: () => void
}

export const useSupportDropdown = create<SupportDropdownStore>()((set, get) => ({
  isDropdown: false,
  openDropdown: () => set({ isDropdown: true }),
  closeDropdown: () => set({ isDropdown: false }),
  toggle: () => {
    set({ isDropdown: !get().isDropdown })
  },
}))
