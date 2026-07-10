"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"

type ProductDetailStore = {
  selectedVariantId: string
  activeImage: string
  selectVariant: (variantId: string) => void
  selectImage: (image: string) => void
}

type SetState = (fn: (prevState: ProductDetailStore) => Partial<ProductDetailStore>) => void

function productDetailStore(set: SetState): ProductDetailStore {
  return {
    selectedVariantId: "",
    activeImage: "",
    selectVariant: variantId => set(() => ({ selectedVariantId: variantId })),
    selectImage: image => set(() => ({ activeImage: image })),
  }
}

export const useProductDetailStore = create<ProductDetailStore>()(devtools(set => productDetailStore(set)))
