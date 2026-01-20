import { Dispatch, SetStateAction } from "react"

import { logFn } from "@/utils/logFn"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export async function fetchProductsDataFromDBFn(
  hasCartStoreInitialized: boolean,
  currentStep: number,
  setCurrentStep: Dispatch<SetStateAction<number>>,
  fetchProductsData: () => Promise<void>,
  t: TI18nFunction,
) {
  logFn("!hasCartStoreInitialized - return")
  if (!hasCartStoreInitialized) return
  if (currentStep === 3) {
    try {
      await fetchProductsData()
    } catch (error) {
      if (error instanceof Error) {
        logFn(t("payment.error.fetch_products_data"), error.message)
      }
    }
  }

  logFn(t("payment.products_data_fetched"))
  setCurrentStep(4)
}
