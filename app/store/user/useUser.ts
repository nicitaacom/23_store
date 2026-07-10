import { create } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { User } from "@supabase/supabase-js"

import useCartStore from "./cartStore"
import { useLoading } from "../ui/useLoading"
import { useMessages } from "../ui/useMessages"
import { delCookie } from "@/utils/helpersCSR"

interface UserStore {
  user: User | null
  clientAvatarUrl: string
  setUser: (user: User | null) => void
  setClientAvatarUrl: (url: string) => void
  clearUser: () => void
  logoutUser: () => void
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

function userStore(set: SetState): UserStore {
  return {
    user: null,
    clientAvatarUrl: "",
    setUser(user: User | null) {
      set((state: UserStore) => ({
        ...state,
        user: user ?? null,
      }))
    },
    setClientAvatarUrl(url: string) {
      set((state: UserStore) => ({
        ...state,
        clientAvatarUrl: url,
      }))
    },
    clearUser() {
      set((state: UserStore) => ({
        ...state,
        user: null,
        clientAvatarUrl: "",
      }))
    },
    logoutUser() {
      delCookie("avatarUrl")
      set((state: UserStore) => ({
        ...state,
        user: null,
        clientAvatarUrl: "",
      }))
    },
  }
}

const useUser = create(subscribeWithSelector(devtools(userStore)))

setTimeout(() => {
  useUser.subscribe(
    state => state.user?.id || null,

    async () => {
      const { setHasCartStoreInitialized } = useLoading.getState()
      setHasCartStoreInitialized(false) // show InitialPageLoadingSkeleton and wait until data will set in products state
      await useCartStore.getState().initialize()
      await useMessages.getState().initialize() // init messages store as well
      // init other stores if needed
      setHasCartStoreInitialized(true)
    },
    { fireImmediately: true },
  )
}, 0) // initialize with next CPU tick to fix error about "uncaught in promise"

export default useUser
