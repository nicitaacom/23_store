import { create } from "zustand"

import { TProductDB } from "@/ts/product/TProductDB"

export type TOwnerProductsSnapshot = {
  products: TProductDB[]
  error: string | null
}

interface OwnerProductsStore extends TOwnerProductsSnapshot {
  hydrate: (products: TProductDB[]) => void
  addProduct: (product: TProductDB) => void
  replaceProduct: (productId: string, nextProduct: TProductDB) => void
  updateProduct: (productId: string, updater: (product: TProductDB) => TProductDB) => void
  removeProduct: (productId: string) => void
  setError: (error: string | null) => void
  restore: (snapshot: TOwnerProductsSnapshot) => void
}

export const useOwnerProductsStore = create<OwnerProductsStore>(set => ({
  products: [],
  error: null,
  hydrate: products => set({ products, error: null }),
  addProduct: product =>
    set(state => ({
      products: [product, ...state.products],
      error: null,
    })),
  replaceProduct: (productId, nextProduct) =>
    set(state => ({
      products: state.products.map(product => (product.id === productId ? nextProduct : product)),
    })),
  updateProduct: (productId, updater) =>
    set(state => ({
      products: state.products.map(product => (product.id === productId ? updater(product) : product)),
    })),
  removeProduct: productId =>
    set(state => ({
      products: state.products.filter(product => product.id !== productId),
    })),
  setError: error => set({ error }),
  restore: snapshot => set(snapshot),
}))
