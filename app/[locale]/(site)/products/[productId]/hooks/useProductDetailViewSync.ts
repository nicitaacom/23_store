"use client"

import { useCallback, useEffect } from "react"

import { TProductVariant } from "@/ts/product/TProductVariant"
import { TProductDB } from "@/ts/product/TProductDB"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useProductDetail } from "@/store/ui/useProductDetail"

interface UseProductDetailViewSyncParams {
  product: TProductDB
  isAuthenticated: boolean
  variants: TProductVariant[]
  galleryImages: string[]
}

function getVariantMainImage(productImages: string[], variant?: TProductVariant) {
  return variant?.image_url || productImages[0] || "/placeholder.jpg"
}

export function useProductDetailViewSync({ product, isAuthenticated, variants, galleryImages }: UseProductDetailViewSyncParams) {
  const { activeImage, selectVariant, selectImage } = useProductDetail()
  const { addView } = useAnonCategoryViewsStore()

  // A previous variant's photo can remain in the gallery, so URL validity alone does not reset it.
  const handleSelectVariant = useCallback((variantId: string) => {
    const variant = variants.find(row => row.id === variantId)
    selectVariant(variantId, getVariantMainImage(product.img_url, variant))
  }, [product.img_url, selectVariant, variants])

  useEffect(() => {
    const firstAvailableVariant = variants.find(variant => variant.quantity > 0) ?? variants[0]
    if (firstAvailableVariant) selectVariant(firstAvailableVariant.id, getVariantMainImage(product.img_url, firstAvailableVariant))
  }, [product.img_url, selectVariant, variants])

  useEffect(() => {
    if (!galleryImages.includes(activeImage)) selectImage(galleryImages[0])
  }, [galleryImages, activeImage, selectImage])

  useEffect(() => {
    if (!product.category_id) return
    if (isAuthenticated) categoryViewsSDK.incrementDBCategoryView({ category_id: product.category_id, delta: 1 }).catch(() => {})
    else addView(product.category_id, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { handleSelectVariant, handleSelectImage: selectImage }
}
