"use client"

import useCartStore from "@/store/user/cartStore"
import { Button } from ".."
import { useCallback } from "react"

interface DecreaseProductQuantityButtonProps {
  productId: string
}

export function DecreaseProductQuantityButton({ productId }: DecreaseProductQuantityButtonProps) {
  const cartStore = useCartStore()

  //component will be rendered twice because I use 2 store (or because I fire method productsStore.setProducts)
  const decreaseProductQuantity = useCallback((id: string) => {
    cartStore.decreaseProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Button
      className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
      variant="danger-outline"
      onClick={() => decreaseProductQuantity(productId)}>
      -
    </Button>
  )
}
