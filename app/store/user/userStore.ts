import { create } from "zustand"
import { devtools, persist, subscribeWithSelector } from "zustand/middleware"
import useCartStore from "./cartStore"

interface UserStore {
  userId: string
  isAuthenticated: boolean
  username: string
  email: string
  avatarUrl: string
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
    isAuthenticated => useCartStore.getState().initialize(),
    { fireImmediately: true },
  )
}, 50)

export default useUserStore
