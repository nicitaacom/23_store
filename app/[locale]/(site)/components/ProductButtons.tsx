"use client"

import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { Button } from "@/components/ui"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"
import useCartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { FiEdit3, FiExternalLink } from "react-icons/fi"

interface ProductButtonsProps {
  productId: string
  ownerId: string
  showViewButton?: boolean
}

export function ProductButtons({ productId, ownerId, showViewButton = true }: ProductButtonsProps) {
  const cartStore = useCartStore()
  const quantity = cartStore.products?.[productId]?.quantity ?? 0
  const locale = useCurrentLocale()
  const t = useScopedI18n("product")
  const user = useUserStore(state => state.user)
  const isOwner = user?.id === ownerId

  return (
    <div className="flex w-full min-w-0 flex-wrap items-end justify-center gap-3 tablet:justify-end">
      {isOwner && (
        <Button
          className="w-full mobile:w-fit font-medium"
          href={`/${locale}/products/${productId}/manage`}
          variant="success-outline"
          size="lg"
          rounded="lg"
          shadow="sm"
          rightIcon={<FiEdit3 className="text-base" />}>
          {t("manage_product")}
        </Button>
      )}

      {quantity === 0 ? (
        <AddToCartButton productId={productId} />
      ) : (
        <>
          <ProductQuantityButton action="increase" productId={productId} />
          <ProductQuantityButton action="decrease" productId={productId} />
          <ProductQuantityButton action="clear" productId={productId} />
        </>
      )}

      {showViewButton && (
        <Button
          className="w-full mobile:w-fit font-medium"
          href={`/${locale}/products/${productId}`}
          variant="info-outline"
          size="lg"
          rounded="lg"
          shadow="sm"
          rightIcon={<FiExternalLink className="text-base" />}>
          {t("view_product")}
        </Button>
      )}
    </div>
  )
}
