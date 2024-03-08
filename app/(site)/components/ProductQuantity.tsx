"use client"

import useCartStore from "@/store/user/cartStore"
import { formatCurrency } from "@/utils/currencyFormatter"
import { useMemo } from "react"

interface ProductQuantityProps {
  productId: string
  productPrice: number
}

export function ProductQuantity({ productId, productPrice }: ProductQuantityProps) {
  const { products } = useCartStore()
  const quantity = products?.[productId]?.quantity ?? 0

  const subTotal = useMemo(() => {
    return formatCurrency(quantity * productPrice)
  }, [productPrice, quantity])

  return (
    <div className={`flex flex-col justify-center ${quantity === 0 ? "hidden" : "flex"}`}>
      <h5 className={`text-xl tablet:text-base laptop:text-lg text-center laptop:text-start`}>
        Quantity: <span>{quantity}</span>
      </h5>
      <h5 className="text-xl tablet:text-base laptop:text-lg text-center laptop:text-start flex flex-row justify-center laptop:justify-start">
        Sub-total:&nbsp;<p>{subTotal}</p>
      </h5>
    </div>
  )
}
