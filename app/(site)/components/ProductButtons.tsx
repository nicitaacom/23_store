"use client"

import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"
import useCartStore from "@/store/user/cartStore"
import { TProductDB } from "@/TS/product/TProductDB"

interface ProductButtonsProps {
  productId: string
}

export function ProductButtons({ productId }: ProductButtonsProps) {
  const cartStore = useCartStore()
  const quantity = cartStore.products?.[productId]?.quantity ?? 0

  return (
    <div className={`flex flex-row gap-x-2 justify-center laptop:justify-end items-end ${quantity === 0 && "w-full"}`}>
      {quantity === 0 ? (
        <AddToCartButton productId={productId} />
      ) : (
        <>
          <ProductQuantityButton action="increase" productId={productId} />
          <ProductQuantityButton action="decrease" productId={productId} />
          <ProductQuantityButton action="clear" productId={productId} />
        </>
      )}
    </div>
  )
}
