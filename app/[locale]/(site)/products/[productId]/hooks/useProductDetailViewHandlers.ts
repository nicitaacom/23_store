"use client"

import { useEffect } from "react"

import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useProductDetailStore } from "@/store/ui/useProductDetailStore"
import { TProductDB } from "@/ts/product/TProductDB"

const ANON_VIEWS_KEY = "23_category_views_anon"

interface UseProductDetailViewHandlersParams {
  product: TProductDB
  isAuthenticated: boolean
  variants: { id: string }[]
  galleryImages: string[]
}

export function useProductDetailViewHandlers({ product, isAuthenticated, variants, galleryImages }: UseProductDetailViewHandlersParams) {
  const { activeImage, selectVariant, selectImage } = useProductDetailStore()

  // 1. Default the selected variant to the first one when the product changes
  useEffect(() => {
    if (variants.length) selectVariant(variants[0].id)
  }, [variants, selectVariant])

  // 2. Keep the active image valid for the current gallery
  useEffect(() => {
    if (!galleryImages.includes(activeImage)) selectImage(galleryImages[0])
  }, [galleryImages, activeImage, selectImage])

  // 3. Record category view on product page visit (delta 1)
  useEffect(() => {
    if (!product.category_id) return
    if (isAuthenticated) {
      categoryViewsSDK.incrementDBCategoryView({ category_id: product.category_id, delta: 1 }).catch(() => {})
    } else {
      try {
        const raw = localStorage.getItem(ANON_VIEWS_KEY)
        const existing: Record<string, number> = raw ? JSON.parse(raw) : {}
        existing[product.category_id] = (existing[product.category_id] ?? 0) + 1
        localStorage.setItem(ANON_VIEWS_KEY, JSON.stringify(existing))
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { handleSelectVariant: selectVariant, handleSelectImage: selectImage }
}
