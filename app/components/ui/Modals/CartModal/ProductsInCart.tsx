"use client"

import { useState } from "react"
import { FiChevronDown } from "react-icons/fi"

import { requestBetterPrices } from "./functions/requestBetterPrices"
import { Button } from "../.."
import { PaymentButtons } from "./PaymentButtons/PaymentButtons"
import { formatCurrency } from "@/utils/currencyFormatter"
import { trackBuyingFlowEvent } from "@/utils/trackBuyingFlowEvent"
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import useCartStore from "@/store/user/cartStore"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import useUser from "@/store/user/useUser"
import { Product } from "@/[locale]/(site)/components"

// http://localhost:6006/?path=/story/commerce-cartcomposition--empty
export function ProductsInCart() {
  const [arePaymentOptionsOpen, setArePaymentOptionsOpen] = useState(false)
  const t = useI18n()
  const locale = useCurrentLocale()
  const cartStore = useCartStore()
  const areYouSureClearCartModal = useAreYouSureClearCartModal()
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const { user } = useUser()

  async function handleRequestBetterPrices() {
    trackBuyingFlowEvent({ event: "checkout_click", checkoutKind: "request_better_prices" })
    setIsLoading(true)
    const response = await requestBetterPrices(t, cartStore.productsData, cartStore.getProductsPrice(), user?.email || null)
    setIsLoading(false)
    if (response.success) {
      toast.show("success", t("product.success.better_prices_title"), response.message)
      return
    }

    toast.show("error", t("product.error.better_prices_title"), response.message)
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden laptop:flex-row">
      {/* Products list */}
      <section className="min-h-0 flex-1 overflow-y-auto pr-1 hide-scrollbar">
        <div className="flex flex-col gap-2">
          {cartStore.productsData.map(productData => (
            <Product {...productData} containerClassName="border border-border-color/20 shrink-0" key={productData.cartKey} />
          ))}
        </div>
      </section>

      {/* 1. Order summary sidebar — flex-col with actions pinned to bottom */}
      <aside className="flex shrink-0 flex-col gap-3 laptop:w-[300px] laptop:border-l laptop:border-border-color/20 laptop:pl-4 desktop:w-[340px]">
        {/* 2. Summary panel — soft accent gradient, emphasized total */}
        <div className="rounded-md border border-border-color/20 bg-gradient-to-br from-foreground/10 to-transparent p-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-subTitle">{t("product.order_summary")}</p>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-subTitle">{t("product.subtotal")}</span>
            <span className="text-sm font-medium text-title" data-cy="cart-subtotal">
              {formatCurrency(cartStore.getProductsPrice(), locale)}
            </span>
          </div>

          <div className="my-2 h-px bg-border-color/20" />

          {/* 3. Total emphasized */}
          <div className="flex items-end justify-between py-1">
            <span className="text-sm font-semibold text-title">{t("product.total")}</span>
            <span className="text-2xl font-bold tracking-tight text-success" data-cy="cart-total">
              {formatCurrency(cartStore.getProductsPrice(), locale)}
            </span>
          </div>
        </div>

        {/* 4. Actions — primary first, optional payments second, destructive last */}
        <div className="flex flex-col gap-2 laptop:mt-auto">
          <Button
            className="w-full border-success bg-success text-black hover:bg-success/90"
            data-cy="request-better-prices"
            variant="success"
            size="md"
            disabled={isLoading}
            onClick={handleRequestBetterPrices}>
            {t("product.request_better_prices")}
          </Button>

          <Button
            className="w-full"
            data-cy="other-ways-to-pay"
            variant="secondary-outline"
            size="md"
            aria-expanded={arePaymentOptionsOpen}
            onClick={() => setArePaymentOptionsOpen(isOpen => !isOpen)}
            rightIcon={
              <FiChevronDown className={arePaymentOptionsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            }>
            {t("product.other_ways_to_pay")}
          </Button>

          {arePaymentOptionsOpen && <PaymentButtons />}

          <Button className="w-full" variant="danger-outline" size="md" onClick={areYouSureClearCartModal.openModal}>
            {t("product.clear_cart")}
          </Button>
        </div>
      </aside>
    </div>
  )
}
