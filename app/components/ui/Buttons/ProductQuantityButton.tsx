"use client"

import { useCallback } from "react"
import { MdOutlineDeleteOutline } from "react-icons/md"
import { twMerge } from "tailwind-merge"

import { Button } from ".."
import { MinusDecreaseQuantityButton } from "./MinusDecreaseQuantityButton"
import { PlusIncreaseQuantityButton } from "./PlusIncreaseQuantityButton"
import useCartStore from "@/store/user/cartStore"
import { useScopedI18n } from "@/locales/client"

type ProductQuantityAction = "increase" | "decrease" | "clear"

interface ProductQuantityButtonProps {
  className?: string
  productId: string
  action: ProductQuantityAction
  variantId?: string | null
}

// http://localhost:6006/?path=/story/ui-controls-selectioncontrols--selection
export function ProductQuantityButton({ className, productId, action, variantId }: ProductQuantityButtonProps) {
  const t = useScopedI18n("common")
  const { clearProductQuantity } = useCartStore()

  const handleClear = useCallback(() => {
    clearProductQuantity(productId, variantId)
  }, [clearProductQuantity, productId, variantId])

  if (action === "increase") {
    return <PlusIncreaseQuantityButton className={className} productId={productId} variantId={variantId} />
  }

  if (action === "decrease") {
    return <MinusDecreaseQuantityButton className={className} productId={productId} variantId={variantId} />
  }

  // 3. Clear — danger icon button
  return (
    <Button
      className={twMerge("h-11 rounded font-medium w-full mobile:w-fit", className)}
      variant="danger-outline"
      size="md"
      rounded="lg"
      shadow="sm"
      data-cy={`product-quantity-clear-${productId}${variantId ? `-${variantId}` : ""}`}
      rightIcon={<MdOutlineDeleteOutline className="text-danger" />}
      onClick={handleClear}>
      {t("clear")}
    </Button>
  )
}
