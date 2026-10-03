"use client"

import { useEffect } from "react"

import { TProductDB } from "@/ts/product/TProductDB"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useProductDetail } from "@/store/ui/useProductDetail"

interface UseProductDetailViewSyncParams {
  product: TProductDB
  isAuthenticated: boolean
  variants: { id: string; quantity: number }[]
  galleryImages: string[]
}

export function useProductDetailViewSync({ product, isAuthenticated, variants, galleryImages }: UseProductDetailViewSyncParams) {
  const { activeImage, selectVariant, selectImage } = useProductDetail()
  const { addView } = useAnonCategoryViewsStore()

  useEffect(() => {
    const firstAvailableVariant = variants.find(variant => variant.quantity > 0) ?? variants[0]
    if (firstAvailableVariant) selectVariant(firstAvailableVariant.id)
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
