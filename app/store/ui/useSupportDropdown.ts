import { create } from "zustand"

type SupportDropdownStore = {
  imageFiles: File[]
  setImageFiles: (emailImageFile: File[]) => void

  isDropdown: boolean
  openDropdown: () => void
  closeDropdown: () => void
  toggle: () => void
}

export const useSupportDropdown = create<SupportDropdownStore>()((set, get) => ({
  imageFiles: [],
  setImageFiles: imageFiles => set(state => ({ ...state, imageFiles })),

  isDropdown: false,
  openDropdown: () => set({ isDropdown: true }),
  closeDropdown: () => set({ isDropdown: false }),
  toggle: () => {
    set({ isDropdown: !get().isDropdown })
  },
}))
