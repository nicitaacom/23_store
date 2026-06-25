"use client"

import { BsCart3 } from "react-icons/bs"
import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { useCallback } from "react"
import { Button } from ".."
import { useScopedI18n } from "@/locales/client"
import { twMerge } from "tailwind-merge"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"

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
  const { addView } = useAnonCategoryViewsStore()

  const handleAddToCart = useCallback(() => {
    cartStore.increaseProductQuantity(productId, variantId ?? null)
    if (!categoryId) return
    if (user) categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId, delta: 3 }).catch(() => {})
    else addView(categoryId, 3)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId, categoryId, user])

  return (
    <Button
      className={twMerge("w-full mobile:w-fit rounded font-medium", className)}
      variant="success"
      size="md"
      rounded="lg"
      shadow="sm"
      rightIcon={<BsCart3 className="text-lg" />}
      onClick={handleAddToCart}>
      {t("add_to_cart")}
    </Button>
  )
}
