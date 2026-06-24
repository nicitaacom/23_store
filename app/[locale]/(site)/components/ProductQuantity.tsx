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

  if (quantity === 0) return null

  return (
    // 1. Dense metadata block — quantity and subtotal stacked tight
    <div className="flex flex-col gap-0.5">
      <p className="whitespace-nowrap text-xs text-subTitle">
        {t("quantity")}: <span className="font-medium text-title">{quantity}</span>
      </p>
      <p className="whitespace-nowrap text-xs text-subTitle">
        {t("subtotal")}: <span className="font-medium text-title">{subTotal}</span>
      </p>
    </div>
  )
}
