import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

type ResetEmailStore = {
  email: { value: string; expires: number } | null
  setEmail: (email: { value: string; expires: number }) => void
  clearEmail: () => void
}

type SetState = (fn: (prevState: ResetEmailStore) => Partial<ResetEmailStore>) => void

const resetEmailStore = (set: SetState): ResetEmailStore => ({
  email: null,
  setEmail: email => set(() => ({ email })),
  clearEmail: () => set(() => ({ email: null })),
})

export const useResetEmailStore = create<ResetEmailStore>()(devtools(persist(set => resetEmailStore(set), { name: "email" })))
