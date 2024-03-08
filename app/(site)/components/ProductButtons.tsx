"use client"

import {
  ClearProductQuantityButton,
  DecreaseProductQuantityButton,
  IncreaseProductQuantityButton,
} from "@/components/ui/Buttons"
import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import useCartStore from "@/store/user/cartStore"

interface ProductButtonsProps {
  productId: string
  productOnStock: number
}

export function ProductButtons({ productId, productOnStock }: ProductButtonsProps) {
  const cartStore = useCartStore()
  const quantity = cartStore.products?.[productId]?.quantity ?? 0

  return (
    <div
      className={`flex flex-row gap-x-2 justify-center laptop:justify-end items-end 
            ${quantity === 0 && "w-full"}`}>
      {quantity === 0 ? (
        <AddToCartButton productId={productId} productOnStock={productOnStock} />
      ) : (
        <>
          <IncreaseProductQuantityButton productId={productId} productOnStock={productOnStock} />
          <DecreaseProductQuantityButton productId={productId} />
          <ClearProductQuantityButton productId={productId} />
        </>
      )}
    </div>
  )
}
