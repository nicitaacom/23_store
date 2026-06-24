"use client"

import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { Button } from "@/components/ui"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"
import useCartStore from "@/store/user/cartStore"
import { createCartProductKey } from "@/utils/cartProducts"
import { FiExternalLink } from "react-icons/fi"
import { ManageProductButton } from "./ManageProductButton"

interface ProductButtonsProps {
  productId: string
  ownerId: string
  showViewButton?: boolean
  variantId?: string | null
}

export function ProductButtons({ productId, ownerId, showViewButton = true, variantId }: ProductButtonsProps) {
  const cartStore = useCartStore()
  const quantity = cartStore.products?.[createCartProductKey(productId, variantId)]?.quantity ?? 0
  const locale = useCurrentLocale()
  const t = useScopedI18n("product")

  return (
    // 1. Actions row — standardized icon buttons, grouped by intent
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
      <ManageProductButton className="rounded" productId={productId} ownerId={ownerId} />

      {quantity === 0 ? (
        <AddToCartButton productId={productId} variantId={variantId} />
      ) : (
        <>
          {/* 2. Quantity stepper — segmented pair */}
          <div className="flex items-center rounded border border-border-color/35 overflow-hidden">
            <ProductQuantityButton action="decrease" productId={productId} variantId={variantId} />
            <div className="h-6 w-px bg-border-color/35" />
            <ProductQuantityButton action="increase" productId={productId} variantId={variantId} />
          </div>

          {/* 3. Destructive action — clear */}
          <ProductQuantityButton action="clear" productId={productId} variantId={variantId} />
        </>
      )}

      {showViewButton && (
        <Button
          className="w-full mobile:w-fit rounded font-medium"
          href={`/${locale}/products/${productId}`}
          variant="info-outline"
          size="md"
          rounded="lg"
          shadow="sm"
          rightIcon={<FiExternalLink className="text-info" />}>
          {t("view_product")}
        </Button>
      )}
    </div>
  )
}
