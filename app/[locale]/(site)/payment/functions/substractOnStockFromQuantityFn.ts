import axios, { AxiosError } from "axios"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { TAPIPaymentSuccess } from "@/api/payment/success/route"
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
    await axios.post("/api/payment/success", { cartProducts: products } as TAPIPaymentSuccess)
    clearCart()
    router.replace("/")
    logFn(t("payment.substracted_on_stock_from_quantity"))
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(24, t("payment.error.substracted_on_stock_from_quantity"), error.response?.data)
      toast.show("error", t("payment.error.substracted_on_stock_from_quantity"), error.response?.data, 15000)
    }
  }
}
