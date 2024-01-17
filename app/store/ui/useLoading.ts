import { create } from "zustand"

// to show skeleton use useState because you need to show skeleton only for loading component
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
