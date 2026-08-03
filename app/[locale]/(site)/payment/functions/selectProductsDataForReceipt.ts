import { Dispatch, SetStateAction } from "react"

import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { logFn } from "@/utils/logFn"

export async function selectProductsDataForReceipt(
  hasCartStoreInitialized: boolean,
  currentStep: number,
  setCurrentStep: Dispatch<SetStateAction<number>>,
  selectProductsData: () => Promise<TProductAfterDB[]>,
  setReceiptProducts: Dispatch<SetStateAction<TProductAfterDB[]>>,
  translate: TI18nFunction,
) {
  if (!hasCartStoreInitialized || currentStep !== 3) return

  try {
    const selectProductsDataResp = await selectProductsData()
    if (selectProductsDataResp.length === 0) {
      logFn(translate("payment.error.fetch_products_data"), "cart contains no selectable products")
      return
    }

    setReceiptProducts(selectProductsDataResp)
  } catch (error) {
    if (error instanceof Error) {
      logFn(translate("payment.error.fetch_products_data"), error.message)
    }
    return
  }

  logFn(translate("payment.products_data_fetched"))
  setCurrentStep(4)
}
