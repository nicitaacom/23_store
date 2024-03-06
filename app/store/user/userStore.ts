import { create } from "zustand"
import { devtools, persist, subscribeWithSelector } from "zustand/middleware"
import useCartStore from "./cartStore"
import { useLoading } from "../ui/useLoading"
import { setCookie } from "@/utils/helpersCSR"

interface UserStore {
  userId: string
  isAuthenticated: boolean
  username: string
  email: string
  avatarUrl: string | null
  setUser: (userId: string, username: string, email: string, avatarUrl: string) => void
  logoutUser: () => void
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  userId: "",
  isAuthenticated: false,
  username: "",
  email: "",
  avatarUrl: "",
  setUser(userId: string, username: string, email: string, avatarUrl: string) {
    if (avatarUrl) setCookie("avatarUrl", avatarUrl) // to prevent hydration error (cookies availabe on server so content match)
    set((state: UserStore) => ({
      ...state,
      userId: userId,
      isAuthenticated: true,
      username: username,
      email: email,
      avatarUrl: avatarUrl,
    }))
  },
  logoutUser() {
    set((state: UserStore) => ({
      ...state,
      userId: "",
      isAuthenticated: false,
      username: "",
      email: "",
      avatarUrl: "",
    }))
  },
})

const useUserStore = create(subscribeWithSelector(devtools(persist(userStore, { name: "userStore" }))))

setTimeout(() => {
  useUserStore.subscribe(
    state => state.isAuthenticated,

    async isAuthenticated => {
      const { setHasCartStoreInitialized } = useLoading.getState()
      setHasCartStoreInitialized(false) // show InitialPageLoadingSkeleton and wait until data will set in products state
      await useCartStore.getState().initialize()
      setHasCartStoreInitialized(true)
    },
    { fireImmediately: true },
  )
}, 0) // initialize with next CPU tick to fix error about "uncaught in promise"

export default useUserStore
