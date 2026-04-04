import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export async function substractOnStockFromQuantityFn(
  products: TRecordCartProduct,
  clearCart: () => void,
  router: AppRouterInstance,
  t: TI18nFunction,
) {
  const toast = useToast.getState()
  try {
    await productsSDK.completePayment({ cartProducts: products })

    clearCart()
    router.replace("/")
    logFn(t("payment.substracted_on_stock_from_quantity"))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(24, t("payment.error.substracted_on_stock_from_quantity"), errorMessage)
    toast.show("error", t("payment.error.substracted_on_stock_from_quantity"), errorMessage, 15000)
  }
}
