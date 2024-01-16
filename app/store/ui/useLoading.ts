import { create } from "zustand"

interface LoadingStore {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

export const useLoading = create<LoadingStore>()(set => ({
  isLoading: false,
  setIsLoading: isLoading => {
    set(() => ({
      isLoading: isLoading,
    }))
  },
}))
