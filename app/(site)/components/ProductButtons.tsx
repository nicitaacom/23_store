"use client"

import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"
import useCartStore from "@/store/user/cartStore"

interface ProductButtonsProps {
  productId: string
  productOnStock: number
}

export function ProductButtons({ productId, productOnStock }: ProductButtonsProps) {
  const cartStore = useCartStore()
  const quantity = cartStore.products?.[productId]?.quantity ?? 0

  return (
    <div className={`flex flex-row gap-x-2 justify-center laptop:justify-end items-end ${quantity === 0 && "w-full"}`}>
      {quantity === 0 ? (
        <AddToCartButton productId={productId} productOnStock={productOnStock} />
      ) : (
        <>
          <ProductQuantityButton action="increase" productId={productId} productOnStock={productOnStock} />
          <ProductQuantityButton action="decrease" productId={productId} />
          <ProductQuantityButton action="clear" productId={productId} />
        </>
      )}
    </div>
  )
}
