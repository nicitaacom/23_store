import axios, { AxiosError } from "axios"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { TAPIPaymentSuccess } from "@/api/payment/success/route"
import { TRecordCartProduct } from "@/TS/product/TRecordCartProduct"
import useToast from "@/store/ui/useToast"
import { logFn } from "@/utils/logFn"

export async function substractOnStockFromQuantityFn(
  products: TRecordCartProduct,
  clearCart: () => void,
  router: AppRouterInstance,
) {
  const toast = useToast.getState()
  try {
    await axios.post("/api/payment/success", { cartProducts: products } as TAPIPaymentSuccess)
    clearCart()
    router.replace("/")
    logFn("substracted on stock from quantity - redirecting to /")
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(158, "Error substracting on stock - ", error.response?.data)
      toast.show("error", "Error substracting on stock from product quantity", error.response?.data, 15000)
    }
  }
}
