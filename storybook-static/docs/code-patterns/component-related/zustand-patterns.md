1. For Zustand, do not use selector style like `useStore(state => state.value)`.
   1.1 in .tsx components: `const { value, action } = useStore()`
   1.2 in .ts: `const { value, action } = useStore.getState()`

Example of zustand store

```ts
import { create } from "zustand"

type State = {
  state: string
  setState: (state: string) => void
}

export const useState = create<State>()(set => ({
  state: "",
  setState: state => set(() => ({ state })),
}))
```

s
Example of zustand store (persist)

```ts
import { create } from "zustand"
import { persist, subscribeWithSelector } from "zustand/middleware"

type StoreName = {
  isDarkMode: boolean
  setDarkMode: (isDarkMode: boolean) => void
  toggleDarkMode: () => void
}

type SetState = (fn: (prevState: StoreName) => Partial<StoreName>) => void
type GetState = () => StoreName

const useStoreName = (set: SetState, get: GetState): StoreName => ({
  isDarkMode: false,
  setDarkMode: isDarkMode => set(() => ({ isDarkMode })),
  toggleDarkMode: () => set(state => ({ isDarkMode: !state.isDarkMode })),
})

export const useStoreNameStore = create<StoreName>()(
  subscribeWithSelector(
    persist((set, get) => useStoreName(set, get), {
      name: "storeName",
      partialize: state => ({ isDarkMode: state.isDarkMode }),
    }),
  ),
)
```
