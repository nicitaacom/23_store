"use client"

import useCartStore from "@/store/user/cartStore"

import { Button } from "../.."
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { formatCurrency } from "@/utils/currencyFormatter"
import { PaymentButtons } from "./PaymentButtons/PaymentButtons"
import { Product } from "@/(site)/components"

export function ProductsInCart() {
  const cartStore = useCartStore()
  const areYouSureClearCartModal = useAreYouSureClearCartModal()

  return (
    <div className="flex flex-col laptop:flex-row gap-6 h-full overflow-hidden">
      <section className="flex-1 flex flex-col gap-y-4 overflow-y-auto pr-2 hide-scrollbar">
        {cartStore.productsData.map(productData => (
          <Product {...productData} containerClassName="border border-border-color/30 shrink-0" key={productData.id} />
        ))}
      </section>

      <aside className="laptop:w-[380px] desktop:w-[420px] shrink-0 flex flex-col gap-y-4 laptop:border-l laptop:border-border-color/30 laptop:pl-6">
        <div className="bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-xl p-5">
          <h2 className="text-sm font-medium text-subTitle uppercase tracking-wide mb-3">Order Summary</h2>

          <div className="flex justify-between items-center mb-4">
            <span className="text-base text-subTitle">Subtotal</span>
            <span className="text-lg text-title font-semibold">{formatCurrency(cartStore.getProductsPrice())}</span>
          </div>

          <div className="h-px bg-border-color/30 mb-4" />

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-title">Total</span>
            <span className="text-2xl font-bold text-success">{formatCurrency(cartStore.getProductsPrice())}</span>
          </div>
        </div>

        <div className="bg-background/50 border border-border-color/30 rounded-xl p-5">
          <h2 className="text-base font-semibold text-title mb-4">Payment Method</h2>
          <PaymentButtons />
        </div>

        <Button
          className="w-full hover:shadow-lg transition-all"
          variant="danger-outline"
          size="lg"
          rounded="lg"
          shadow="sm"
          onClick={areYouSureClearCartModal.openModal}>
          Clear cart
        </Button>
      </aside>
    </div>
  )
}
