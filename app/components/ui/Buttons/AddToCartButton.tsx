"use client"

import useCartStore from "@/store/user/cartStore"
import { useCallback } from "react"
import { Button } from ".."
import { useI18n, useScopedI18n } from "@/locales/client"

interface AddToCartButtonProps {
  productId: string
}
/**
 *
 * @deprecated
 */
export function AddToCartButton({ productId }: AddToCartButtonProps) {
  const t = useScopedI18n("product")
  const cartStore = useCartStore()

  const increaseProductQuantity = useCallback((id: string) => {
    cartStore.increaseProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Button
      className="min-w-[50px] max-h-[50px] h-[50px] laptop:w-fit text-xl font-medium"
      variant="success-outline"
      onClick={() => increaseProductQuantity(productId)}>
      {t("add_to_cart")}
    </Button>
  )
}
