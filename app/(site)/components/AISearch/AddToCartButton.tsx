"use client"

import { Button } from "@/components/ui"
import useCartStore from "@/store/user/cartStore"
import { BsCart3 } from "react-icons/bs"

interface AddToCartButtonProps {
  productId: string
  className?: string
}

export function AddToCartButton({ productId, className }: AddToCartButtonProps) {
  const { increaseProductQuantity } = useCartStore()

  return (
    <Button
      className={`w-full font-semibold hover:shadow-success/30 transition-shadow ${className}`}
      variant="success"
      size="lg"
      rounded="lg"
      shadow="sm"
      rightIcon={<BsCart3 className="text-lg" />}
      onClick={() => increaseProductQuantity(productId)}>
      Add to Cart
    </Button>
  )
}
