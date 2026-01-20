"use client"

import useCartStore from "@/store/user/cartStore"

import { Button } from "../.."
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { formatCurrency } from "@/utils/currencyFormatter"
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { requestBetterPrices } from "./functions/requestBetterPrices"
import { Product } from "@/[locale]/(site)/components"
import { useI18n } from "@/locales/client"
import useUserStore from "@/store/user/userStore"

export function ProductsInCart() {
  const t = useI18n()
  const cartStore = useCartStore()
  const areYouSureClearCartModal = useAreYouSureClearCartModal()
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const userStore = useUserStore()

  async function handleRequestBetterPrices() {
    setIsLoading(true)
    const result = await requestBetterPrices(t, cartStore.productsData, cartStore.getProductsPrice(), userStore.email)
    setIsLoading(false)
    result.success
      ? toast.show("success", "Request sent!", result.message)
      : toast.show("error", "Request failed", result.message)
  }

  return (
    <div className="flex flex-col laptop:flex-row gap-6 h-full overflow-hidden">
      <section className="flex-1 flex flex-col gap-y-4 overflow-y-auto pr-2 hide-scrollbar">
        {cartStore.productsData.map(productData => (
          <Product {...productData} containerClassName="border border-border-color/30 shrink-0" key={productData.id} />
        ))}
      </section>

      <aside className="laptop:w-[380px] desktop:w-[420px] shrink-0 flex flex-col gap-y-4 laptop:border-l laptop:border-border-color/30 laptop:pl-6">
        <div className="bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-xl p-5">
          <h2 className="text-sm font-medium text-subTitle uppercase tracking-wide mb-3">{t("product.order_summary")}</h2>

          <div className="flex justify-between items-center mb-4">
            <span className="text-base text-subTitle">{t("product.subtotal")}</span>
            <span className="text-lg text-title font-semibold">{formatCurrency(cartStore.getProductsPrice())}</span>
          </div>

          <div className="h-px bg-border-color/30 mb-4" />

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-title">{t("product.total")}</span>
            <span className="text-2xl font-bold text-success">{formatCurrency(cartStore.getProductsPrice())}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-xl p-5">
          <Button
            className="w-full bg-gradient-to-r from-success to-success-accent hover:from-success-accent
            hover:to-success text-black font-semibold shadow-lg shadow-success/30 hover:shadow-xl hover:shadow-success/40 transition-all border-0"
            size="lg"
            rounded="lg"
            disabled={isLoading}
            onClick={handleRequestBetterPrices}>
            {t("product.request_better_prices")}
          </Button>
          {/* <PaymentButtons/> */}
        </div>

        <Button
          className="w-full hover:shadow-lg transition-all"
          variant="danger-outline"
          size="lg"
          rounded="lg"
          shadow="sm"
          onClick={areYouSureClearCartModal.openModal}>
          {t("product.clear_cart")}
        </Button>
      </aside>
    </div>
  )
}
