import { create } from "zustand"

import { TCategory } from "@/ts/categories/TCategory"

interface CategoriesStore {
  categories: TCategory[]
  hydrate: (categories: TCategory[]) => void
  addCategory: (category: TCategory) => void
  updateCategory: (id: string, next: TCategory) => void
  removeCategory: (id: string) => void
}

export const useCategoriesStore = create<CategoriesStore>(set => ({
  categories: [],
  hydrate: categories => set({ categories }),
  addCategory: category => set(state => ({ categories: [...state.categories, category] })),
  updateCategory: (id, next) =>
    set(state => ({ categories: state.categories.map(c => (c.id === id ? next : c)) })),
  removeCategory: id => set(state => ({ categories: state.categories.filter(c => c.id !== id) })),
}))
