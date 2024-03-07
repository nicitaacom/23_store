"use client"

import useCartStore from "@/store/user/cartStore"
import { Button } from ".."
import { useCallback } from "react"

interface IncreaseProductQuantityButtonProps {
  productId: string
  productOnStock: number
}

export function IncreaseProductQuantityButton({ productId, productOnStock }: IncreaseProductQuantityButtonProps) {
  const cartStore = useCartStore()

  const increaseProductQuantity = useCallback((id: string, on_stock: number) => {
    cartStore.increaseProductQuantity(id, on_stock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Button
      className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
      variant="success-outline"
      onClick={() => increaseProductQuantity(productId, productOnStock)}>
      +
    </Button>
  )
}
