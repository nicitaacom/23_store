"use client"

import { useI18n, useScopedI18n } from "@/locales/client"
import useCartStore from "@/store/user/cartStore"
import { createCartProductKey } from "@/utils/cartProducts"
import { formatCurrency } from "@/utils/currencyFormatter"
import { useMemo } from "react"

interface ProductQuantityProps {
  productId: string
  productPrice: number
  variantId?: string | null
}

export function ProductQuantity({ productId, productPrice, variantId }: ProductQuantityProps) {
  const { products } = useCartStore()
  const quantity = products?.[createCartProductKey(productId, variantId)]?.quantity ?? 0
  const t = useScopedI18n("product")

  const subTotal = useMemo(() => {
    return formatCurrency(quantity * productPrice)
  }, [productPrice, quantity])

  return (
    <div className={`flex flex-col justify-center ${quantity === 0 ? "hidden" : "flex"}`}>
      <h5 className={`text-xl tablet:text-base laptop:text-lg text-center laptop:text-start`}>
        {t("quantity")}: <span>{quantity}</span>
      </h5>
      <h5 className="text-xl tablet:text-base laptop:text-lg text-center laptop:text-start flex flex-row justify-center laptop:justify-start">
        {t("subtotal")}:&nbsp;<p>{subTotal}</p>
      </h5>
    </div>
  )
}
