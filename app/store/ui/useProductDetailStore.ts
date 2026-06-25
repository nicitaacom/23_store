"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface ProductDetailStore {
  selectedVariantId: string
  activeImage: string
  selectVariant: (variantId: string) => void
  selectImage: (image: string) => void
}

export const useProductDetailStore = create<ProductDetailStore>()(
  devtools(set => ({
    selectedVariantId: "",
    activeImage: "",
    selectVariant: variantId => set({ selectedVariantId: variantId }),
    selectImage: image => set({ activeImage: image }),
  })),
)
