import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface DarkModeStore {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

type SetState = (fn: (prevState: DarkModeStore) => DarkModeStore) => void

export const toggleDarkMode = (darkMode: DarkModeStore) => {
  return (darkMode.isDarkMode = !darkMode.isDarkMode)
}

export const darkModeStore = (set: SetState): DarkModeStore => ({
  isDarkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  toggleDarkMode() {
    set((state: DarkModeStore) => ({
      ...state,
      isDarkMode: toggleDarkMode(state),
    }))
  },
})

const useDarkModeStore = create(devtools(persist(darkModeStore, { name: "darkMode" })))

export default useDarkModeStore
