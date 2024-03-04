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
    // set anonymousId only when user click on support button
    // so I reduce connections https://github.com/pusher/pusher-js/issues/807#event-11961892697
    const anonymousId = getCookie("anonymousId")
    if (!anonymousId) setCookie("anonymousId", `anonymousId_${crypto.randomUUID()}`)
    set({ isDropdown: !get().isDropdown })
  },
}))
