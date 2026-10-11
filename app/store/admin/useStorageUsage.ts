import { create } from "zustand"

import type { TStorageUsageState } from "@/ts/storage"

export const useStorageUsage = create<TStorageUsageState>(set => ({
  usage: null,
  localError: null,
  setUsage: usage => set({ usage }),
  setLocalError: localError => set({ localError }),
}))
