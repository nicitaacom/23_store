import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

type AnonCategoryViewsStore = {
  views: Record<string, number>
  addView: (categoryId: string, delta: number) => void
  clearViews: () => void
}

type SetState = (fn: (prevState: AnonCategoryViewsStore) => Partial<AnonCategoryViewsStore>) => void

function anonCategoryViewsStore(set: SetState): AnonCategoryViewsStore {
  return {
    views: {},
    addView: (categoryId, delta) =>
      set(state => ({ views: { ...state.views, [categoryId]: (state.views[categoryId] ?? 0) + delta } })),
    clearViews: () => set(() => ({ views: {} })),
  }
}

export const useAnonCategoryViewsStore = create<AnonCategoryViewsStore>()(
  devtools(persist(set => anonCategoryViewsStore(set), { name: "23_category_views_anon" })),
)
