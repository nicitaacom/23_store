import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface DarkModeStore {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

type SetState = (fn: (prevState: DarkModeStore) => DarkModeStore) => void

function toggleDarkMode(darkMode: DarkModeStore) {
  return (darkMode.isDarkMode = !darkMode.isDarkMode)
}

function darkMode(set: SetState): DarkModeStore {
  return {
    isDarkMode: true,
    toggleDarkMode() {
      set((state: DarkModeStore) => ({
        ...state,
        isDarkMode: toggleDarkMode(state),
      }))
    },
  }
}

const useDarkModeStore = create(devtools(persist(darkMode, { name: "darkMode" })))

export default useDarkModeStore
