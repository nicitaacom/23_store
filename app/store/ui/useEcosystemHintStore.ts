import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

type EcosystemHintStage = "hamburger" | "music" | "complete"

interface EcosystemHintStore {
  hintStage: EcosystemHintStage
  hintStartedAt: number | null
  hasHydrated: boolean
  initializeHint: () => void
  markMenuOpened: () => void
  markMusicClicked: () => void
  setHasHydrated: () => void
}

const oneMonthInMilliseconds = 30 * 24 * 60 * 60 * 1000

const useEcosystemHintStore = create<EcosystemHintStore>()(
  devtools(
    persist(
      (set, get) => ({
        hintStage: "hamburger",
        hintStartedAt: null,
        hasHydrated: false,
        initializeHint() {
          const { hintStartedAt } = get()
          const currentTime = Date.now()

          if (hintStartedAt === null) {
            set({ hintStartedAt: currentTime })
            return
          }

          if (currentTime - hintStartedAt >= oneMonthInMilliseconds) {
            set({ hintStage: "hamburger", hintStartedAt: currentTime })
          }
        },
        markMenuOpened() {
          if (get().hintStage === "hamburger") set({ hintStage: "music" })
        },
        markMusicClicked() {
          if (get().hintStage === "music") set({ hintStage: "complete" })
        },
        setHasHydrated() {
          set({ hasHydrated: true })
        },
      }),
      {
        name: "ecosystemHint",
        // `hasHydrated` stays out of storage and out of rehydration on purpose: zustand reads
        // localStorage synchronously at module evaluation, so a persisted `true` would make the
        // first client render show the hint while the server HTML has none - a hydration mismatch.
        // The component flips it in an effect, i.e. after React hydrated the tree.
        partialize: state => ({ hintStage: state.hintStage, hintStartedAt: state.hintStartedAt }),
      },
    ),
  ),
)

export default useEcosystemHintStore
