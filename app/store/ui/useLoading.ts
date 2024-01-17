import { create } from "zustand"

// to show skeleton use useState because you need to show skeleton only for loading component
interface LoadingStore {
  hasCartStoreInitialized: boolean // hasMounted required to wait until cartStore initialize() (if true it show InitialPageLoadingSkeleton)
  isLoading: boolean // disable UI like buttons links etc
  setIsLoading: (isLoading: boolean) => void
  setHasCartStoreInitialized: (hasMounted: boolean) => void
}

export const useLoading = create<LoadingStore>()(set => ({
  hasCartStoreInitialized: false,
  isLoading: false,
  setIsLoading: isLoading => {
    set(() => ({
      isLoading: isLoading,
    }))
  },
  setHasCartStoreInitialized: hasCartStoreInitialized => {
    set(() => ({
      hasCartStoreInitialized: hasCartStoreInitialized,
    }))
  },
}))
