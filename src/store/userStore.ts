import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface UserStore {
  profilePictureUrl: string
  setProfilePictureUrl: (url: string) => void
}


export const setProfilePictureUrl = (url: string) => {
  return url
}

type SetState = (fn: (prevState: UserStore) => UserStore) => void

export const userStore = (set: SetState): UserStore => ({
  profilePictureUrl: "",
  setProfilePictureUrl(url: string) {
    set((state: UserStore) => ({
      ...state,
      profilePictureUrl: setProfilePictureUrl(url),
    }))
  },
})

const useUserStore = create(devtools(persist(userStore, { name: "userStore" })))

export default useUserStore
