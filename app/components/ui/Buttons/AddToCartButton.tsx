"use client"

import { BsCart3 } from "react-icons/bs"
import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { useCallback } from "react"
import { Button } from ".."
import { useScopedI18n } from "@/locales/client"
import { twMerge } from "tailwind-merge"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"

const ANON_VIEWS_KEY = "23_category_views_anon"

interface AddToCartButtonProps {
  productId: string
  categoryId?: string | null
  className?: string
  variantId?: string | null
}
/**
 *
 * @deprecated
 */
export function AddToCartButton({ productId, categoryId, className, variantId }: AddToCartButtonProps) {
  const t = useScopedI18n("product")
  const cartStore = useCartStore()
  const { user } = useUserStore()

  const handleAddToCart = useCallback(() => {
    cartStore.increaseProductQuantity(productId, variantId ?? null)
    // Record category preference on first add (delta 3)
    if (!categoryId) return
    if (user) {
      categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId, delta: 3 }).catch(() => {})
    } else {
      try {
        const raw = localStorage.getItem(ANON_VIEWS_KEY)
        const existing: Record<string, number> = raw ? JSON.parse(raw) : {}
        existing[categoryId] = (existing[categoryId] ?? 0) + 3
        localStorage.setItem(ANON_VIEWS_KEY, JSON.stringify(existing))
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId, categoryId, user])

  return (
    <Button
      className={twMerge("w-full mobile:w-fit rounded font-medium", className)}
      variant="success-outline"
      size="md"
      rounded="lg"
      shadow="sm"
      rightIcon={<BsCart3 className="text-lg" />}
      onClick={handleAddToCart}>
      {t("add_to_cart")}
    </Button>
  )
}
