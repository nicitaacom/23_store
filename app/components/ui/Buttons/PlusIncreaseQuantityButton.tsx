"use client"

import { useCallback } from "react"
import { twMerge } from "tailwind-merge"

import useCartStore from "@/store/user/cartStore"
import { useScopedI18n } from "@/locales/client"

interface PlusIncreaseQuantityButtonProps {
  className?: string
  productId: string
  variantId?: string | null
}

// http://localhost:6006/?path=/story/ui-controls-selectioncontrols--quantity-and-cart
export function PlusIncreaseQuantityButton({ className, productId, variantId }: PlusIncreaseQuantityButtonProps) {
  const t = useScopedI18n("common")
  const { increaseProductQuantity } = useCartStore()

  const handleClick = useCallback(() => {
    increaseProductQuantity(productId, variantId)
  }, [increaseProductQuantity, productId, variantId])

  return (
    <button
      className={twMerge(
        "inline-flex h-11 w-11 items-center justify-center bg-background/55 text-sm font-semibold text-success transition-colors duration-150 hover:bg-foreground/50",
        className,
      )}
      type="button"
      data-cy={`product-quantity-increase-${productId}${variantId ? `-${variantId}` : ""}`}
      aria-label={t("increase_quantity")}
      onClick={handleClick}>
      +
    </button>
  )
}
