"use client"

import { useCallback } from "react"
import { twMerge } from "tailwind-merge"

import useCartStore from "@/store/user/cartStore"
import { useScopedI18n } from "@/locales/client"

interface MinusDecreaseQuantityButtonProps {
  className?: string
  productId: string
  variantId?: string | null
}

// http://localhost:6006/?path=/story/ui-controls-selectioncontrols--quantity-and-cart
export function MinusDecreaseQuantityButton({ className, productId, variantId }: MinusDecreaseQuantityButtonProps) {
  const t = useScopedI18n("common")
  const { decreaseProductQuantity } = useCartStore()

  const handleClick = useCallback(() => {
    decreaseProductQuantity(productId, variantId)
  }, [decreaseProductQuantity, productId, variantId])

  return (
    <button
      className={twMerge(
        "inline-flex h-11 w-11 items-center justify-center bg-background/55 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-foreground/50",
        className,
      )}
      type="button"
      data-cy={`product-quantity-decrease-${productId}${variantId ? `-${variantId}` : ""}`}
      aria-label={t("decrease_quantity")}
      onClick={handleClick}>
      −
    </button>
  )
}
