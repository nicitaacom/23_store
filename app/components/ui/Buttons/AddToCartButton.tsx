"use client"

import useCartStore from "@/store/user/cartStore"
import { Button } from ".."
import { useCallback } from "react"

interface AddToCartButtonProps {
  productId: string
  productOnStock: number
}

export function AddToCartButton({ productId, productOnStock }: AddToCartButtonProps) {
  const cartStore = useCartStore()

  const increaseProductQuantity = useCallback((id: string, on_stock: number) => {
    cartStore.increaseProductQuantity(id, on_stock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Button
      className="min-w-[50px] max-h-[50px] h-[50px] laptop:w-fit text-xl font-medium"
      variant="success-outline"
      onClick={() => increaseProductQuantity(productId, productOnStock)}>
      Add to cart
    </Button>
  )
}
