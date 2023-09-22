import { create } from "zustand"

interface ModalsStore {
  isOpen: Record<string, boolean>
  openModal: (id: string) => void
  closeModal: (id: string) => void
}

export const useModals = create<ModalsStore>()(set => ({
  isOpen: {},
  openModal: id => {
    set(state => ({
      isOpen: {
        ...state.isOpen,
        [id]: true,
      },
    }))
  },
  closeModal: id => {
    set(state => ({
      isOpen: {
        ...state.isOpen,
        [id]: false,
      },
    }))
  },
}))
