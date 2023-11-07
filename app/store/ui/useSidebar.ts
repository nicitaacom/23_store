import { create } from "zustand"

interface SidebarStore {
  isSidebar: boolean
  openSidebar: () => void
  closeSidebar: () => void
}

export const useSidebar = create<SidebarStore>()(set => ({
  isSidebar: false,
  openSidebar: () => set({ isSidebar: true }),
  closeSidebar: () => set({ isSidebar: false }),
}))
