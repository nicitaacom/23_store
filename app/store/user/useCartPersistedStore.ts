import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"

type CartPersistedStore = {
  products: TRecordCartProduct
  setProducts: (products: TRecordCartProduct) => void
}

type SetState = (fn: (prevState: CartPersistedStore) => Partial<CartPersistedStore>) => void

function cartPersistedStore(set: SetState): CartPersistedStore {
  return {
    products: {},
    setProducts: products => set(() => ({ products })),
  }
}

export const useCartPersistedStore = create<CartPersistedStore>()(
  devtools(persist(set => cartPersistedStore(set), { name: "cart" })),
)
