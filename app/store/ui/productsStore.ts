import { ICartProduct } from "@/interfaces/ICartProduct"
import { create } from "zustand"

interface ProductsStore {
  products: ICartProduct[]
  setProducts: (products: ICartProduct[]) => void
}

export const useProductsStore = create<ProductsStore>()(set => ({
  products: [],
  setProducts(_products: ICartProduct[]) {
    set((state: ProductsStore) => ({
      ...state,
      products: _products,
    }))
  },
}))
