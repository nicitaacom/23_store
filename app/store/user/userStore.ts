import { create } from "zustand"
import { devtools, persist, subscribeWithSelector } from "zustand/middleware"
import useCartStore from "./cartStore"
import { useLoading } from "../ui/useLoading"
import { delCookie, setCookie } from "@/utils/helpersCSR"
import { useMessagesStore } from "../ui/useMessagesStore"

interface UserStore {
  userId: string | null
  isAuthenticated: boolean
  username: string | null
  email: string | null
  avatarUrl: string | null
  setUser: (userId: string, username: string, email: string, avatarUrl: string) => void
  logoutUser: () => void
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  userId: null, // it's best practice to use "" only for input value
  isAuthenticated: false,
  username: null,
  email: null,
  avatarUrl: null,
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
    delCookie("avatarUrl") // TODO - why do I need avatarUrl in cookies and local storage?
    set((state: UserStore) => ({
      ...state,
      userId: null,
      isAuthenticated: false,
      username: null,
      email: null,
      avatarUrl: null,
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
      await useMessagesStore.getState().initialize() // init messages store as well
      // init other stores if needed
      setHasCartStoreInitialized(true)
    },
    { fireImmediately: true },
  )
}, 0) // initialize with next CPU tick to fix error about "uncaught in promise"

export default useUserStore
