"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"

type ProductDetailStore = {
  selectedVariantId: string
  activeImage: string
  selectVariant: (variantId: string, image: string) => void
  selectImage: (image: string) => void
}

type SetState = (fn: (prevState: ProductDetailStore) => Partial<ProductDetailStore>) => void

const productDetailStore = (set: SetState): ProductDetailStore => ({
  selectedVariantId: "",
  activeImage: "",
  selectVariant: (variantId, image) => set(() => ({ selectedVariantId: variantId, activeImage: image })),
  selectImage: image => set(() => ({ activeImage: image })),
})

export const useProductDetail = create<ProductDetailStore>()(devtools(set => productDetailStore(set)))
