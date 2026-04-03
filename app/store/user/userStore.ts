import { create } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { User } from "@supabase/supabase-js"
import useCartStore from "./cartStore"
import { useLoading } from "../ui/useLoading"
import { delCookie } from "@/utils/helpersCSR"
import { useMessagesStore } from "../ui/useMessagesStore"
import { normalizeUser } from "@/utils/user"

interface UserStore {
  user: User | null
  setUser: (user: User | null) => void
  clearUser: () => void
  logoutUser: () => void
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

const userStore = (set: SetState): UserStore => ({
  user: null,
  setUser(user: User | null) {
    const normalizedUser = normalizeUser(user)
    set((state: UserStore) => ({
      ...state,
      user: normalizedUser,
    }))
  },
  clearUser() {
    set((state: UserStore) => ({
      ...state,
      user: null,
    }))
  },
  logoutUser() {
    delCookie("avatarUrl")
    set((state: UserStore) => ({
      ...state,
      user: null,
    }))
  },
})

const useUserStore = create(subscribeWithSelector(devtools(userStore)))

setTimeout(() => {
  useUserStore.subscribe(
    state => state.user?.id || null,

    async () => {
      const { setHasCartStoreInitialized } = useLoading.getState()
      setHasCartStoreInitialized(false) // show InitialPageLoadingSkeleton and wait until data will set in products state
      await useCartStore.getState().initialize()
      await useMessagesStore.getState().initialize() // init messages store as well
      // init other stores if needed
      setHasCartStoreInitialized(true)
    },
    { fireImmediately: true },
  )
}, 0) // initialize with next CPU tick to fix error about "uncaught in promise"

export default useUserStore
