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
    <div className="flex w-full min-w-0 flex-wrap items-end justify-center gap-3 tablet:justify-end">
      <ManageProductButton className="rounded" productId={productId} ownerId={ownerId} />

      {quantity === 0 ? (
        <AddToCartButton productId={productId} variantId={variantId} />
      ) : (
        <>
          <ProductQuantityButton action="increase" productId={productId} variantId={variantId} />
          <ProductQuantityButton action="decrease" productId={productId} variantId={variantId} />
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
          rightIcon={<FiExternalLink className="text-base" />}>
          {t("view_product")}
        </Button>
      )}
    </div>
  )
}
