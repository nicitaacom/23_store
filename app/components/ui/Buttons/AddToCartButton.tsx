"use client"

import { BsCart3 } from "react-icons/bs"
import useCartStore from "@/store/user/cartStore"
import { useCallback } from "react"
import { Button } from ".."
import { useScopedI18n } from "@/locales/client"
import { twMerge } from "tailwind-merge"

interface AddToCartButtonProps {
  productId: string
  className?: string
}
/**
 *
 * @deprecated
 */
export function AddToCartButton({ productId, className }: AddToCartButtonProps) {
  const t = useScopedI18n("product")
  const cartStore = useCartStore()

  const increaseProductQuantity = useCallback((id: string) => {
    cartStore.increaseProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Button
      className={twMerge("w-full mobile:w-fit rounded font-medium", className)}
      variant="success-outline"
      size="md"
      rounded="lg"
      shadow="sm"
      rightIcon={<BsCart3 className="text-lg" />}
      onClick={() => increaseProductQuantity(productId)}>
      {t("add_to_cart")}
    </Button>
  )
}
