"use client"

import useCartStore from "@/store/user/cartStore"
import { Button } from ".."
import { useCallback } from "react"
import { TProductDB } from "@/TS/product/TProductDB"

interface AddToCartButtonProps {
  productId: string
}

export function AddToCartButton({ productId }: AddToCartButtonProps) {
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
      Add to cart
    </Button>
  )
}
