"use client"

import { FiExternalLink } from "react-icons/fi"

import { ManageProductButton } from "./ManageProductButton"
import { createCartProductKey } from "@/utils/cartProducts"
import useCartStore from "@/store/user/cartStore"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { Button } from "@/components/ui"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"

interface ProductButtonsProps {
  productId: string
  ownerId: string
  showViewButton?: boolean
  variantId?: string | null
  categoryId?: string | null
}

// http://localhost:6006/?path=/story/commerce-product--normal
export function ProductButtons({ productId, ownerId, showViewButton = true, variantId, categoryId }: ProductButtonsProps) {
  const cartStore = useCartStore()
  const quantity = cartStore.products?.[createCartProductKey(productId, variantId)]?.quantity ?? 0
  const locale = useCurrentLocale()
  const t = useScopedI18n("product")

  return (
    // 1. Actions row — standardized icon buttons, grouped by intent
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
      <ManageProductButton className="h-8 min-h-0 rounded px-2 text-xs" size="sm" productId={productId} ownerId={ownerId} />

      {quantity === 0 ? (
        <AddToCartButton className="h-8 min-h-0 px-2 text-xs" productId={productId} variantId={variantId} categoryId={categoryId} />
      ) : (
        <>
          {/* 2. Quantity stepper — segmented pair */}
          <div className="flex items-center rounded border border-border-color/35 overflow-hidden">
            <ProductQuantityButton className="h-8 w-8" action="decrease" productId={productId} variantId={variantId} />
            <div className="h-4 w-px bg-border-color/35" />
            <ProductQuantityButton className="h-8 w-8" action="increase" productId={productId} variantId={variantId} />
          </div>

          {/* 3. Destructive action — clear */}
          <ProductQuantityButton className="h-8 min-h-0 px-2 text-xs" action="clear" productId={productId} variantId={variantId} />
        </>
      )}

      {showViewButton && (
        <Button
          className="h-8 min-h-0 w-full rounded px-2 text-xs font-medium mobile:w-fit"
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
