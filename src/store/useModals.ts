import { create } from "zustand"

interface ModalsStore {
  isOpen: Record<number, boolean>,
  onClose: (id: number) => void
  onOpen: (id: number) => void
}

export const useModalsStore = create<ModalsStore>()((set) => ({
  isOpen: {},
  onClose: (id) => {
    set((state) => ({
      isOpen: {
        ...state.isOpen,
        [id]: false,
      },
    }))
  },
  onOpen: (id) => {
    set((state) => ({
      isOpen: {
        ...state.isOpen,
        [id]: true,
      },
    }))
  },
}))