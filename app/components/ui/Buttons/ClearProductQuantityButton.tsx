"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"
import { Button } from ".."
import useCartStore from "@/store/user/cartStore"
import { useCallback } from "react"

interface ClearProductQuantityButtonProps {
  productId: string
}

export function ClearProductQuantityButton({ productId }: ClearProductQuantityButtonProps) {
  const cartStore = useCartStore()

  const clearProductQuantity = useCallback((id: string) => {
    cartStore.clearProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Button
      className="min-w-[50px] max-h-[50px] h-[50px] laptop:w-fit font-secondary text-xl font-thin"
      variant="danger-outline"
      onClick={() => clearProductQuantity(productId)}>
      Clear
      <MdOutlineDeleteOutline />
    </Button>
  )
}
