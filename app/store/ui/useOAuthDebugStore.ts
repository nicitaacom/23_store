import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

type OAuthDebugStore = {
  lastAttempt: string | null
  setLastAttempt: (payload: string) => void
}

type SetState = (fn: (prevState: OAuthDebugStore) => Partial<OAuthDebugStore>) => void

const oAuthDebugStore = (set: SetState): OAuthDebugStore => ({
  lastAttempt: null,
  setLastAttempt: payload => set(() => ({ lastAttempt: payload })),
})

export const useOAuthDebugStore = create<OAuthDebugStore>()(
  devtools(persist((set) => oAuthDebugStore(set), { name: "oauth:lastAttempt" })),
)
