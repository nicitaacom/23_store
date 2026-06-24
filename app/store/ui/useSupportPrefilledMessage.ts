import { create } from "zustand"

interface SupportPrefilledMessageStore {
  message: string | null
  set: (msg: string) => void
  clear: () => void
}

export const useSupportPrefilledMessage = create<SupportPrefilledMessageStore>(set => ({
  message: null,
  set: msg => set({ message: msg }),
  clear: () => set({ message: null }),
}))
