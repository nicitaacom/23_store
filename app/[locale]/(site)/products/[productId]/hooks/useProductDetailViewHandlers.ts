"use client"

import { useEffect } from "react"

import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useProductDetailStore } from "@/store/ui/useProductDetailStore"
import { TProductDB } from "@/ts/product/TProductDB"

interface UseProductDetailViewHandlersParams {
  product: TProductDB
  isAuthenticated: boolean
  variants: { id: string }[]
  galleryImages: string[]
}

export function useProductDetailViewHandlers({ product, isAuthenticated, variants, galleryImages }: UseProductDetailViewHandlersParams) {
  const { activeImage, selectVariant, selectImage } = useProductDetailStore()
  const { addView } = useAnonCategoryViewsStore()

  useEffect(() => {
    if (variants.length) selectVariant(variants[0].id)
  }, [variants, selectVariant])

  useEffect(() => {
    if (!galleryImages.includes(activeImage)) selectImage(galleryImages[0])
  }, [galleryImages, activeImage, selectImage])

  useEffect(() => {
    if (!product.category_id) return
    if (isAuthenticated) categoryViewsSDK.incrementDBCategoryView({ category_id: product.category_id, delta: 1 }).catch(() => {})
    else addView(product.category_id, 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { handleSelectVariant: selectVariant, handleSelectImage: selectImage }
}
