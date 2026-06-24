import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { TCategory } from "@/ts/categories/TCategory"

interface CategoryPreferencesStore {
  views: Record<string, number>
  recordView: (categoryId: string) => void
  clearViews: () => void
  hydrateFromDB: (dbViews: { category_id: string; view_count: number }[]) => void
  getSortedCategories: (categories: TCategory[], serverViews?: Record<string, number>) => TCategory[]
}

type SetState = (fn: (prev: CategoryPreferencesStore) => CategoryPreferencesStore) => void

const store = (set: SetState, get: () => CategoryPreferencesStore): CategoryPreferencesStore => ({
  views: {},

  recordView: (categoryId: string) =>
    set(state => ({
      ...state,
      views: { ...state.views, [categoryId]: (state.views[categoryId] ?? 0) + 1 },
    })),

  clearViews: () => set(state => ({ ...state, views: {} })),

  hydrateFromDB: dbViews =>
    set(state => {
      const merged = { ...state.views }
      for (const { category_id, view_count } of dbViews) {
        merged[category_id] = Math.max(merged[category_id] ?? 0, view_count)
      }
      return { ...state, views: merged }
    }),

  getSortedCategories: (categories: TCategory[], serverViews?: Record<string, number>) => {
    const views = serverViews ?? get().views
    const rootCategories = categories.filter(c => c.parent_id === null)
    const featured = rootCategories.find(c => c.name === "FEATURED")
    const rest = rootCategories.filter(c => c.name !== "FEATURED")

    const sorted = rest.sort(
      (a, b) => (views[b.id] ?? 0) - (views[a.id] ?? 0) || a.name.localeCompare(b.name),
    )

    return featured ? [featured, ...sorted] : sorted
  },
})

export const useCategoryPreferencesStore = create(devtools(store))
